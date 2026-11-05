const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TOKEN_KEY = "almusaid_token";
const USER_KEY = "almusaid_user";

// ================= SESSION STORAGE =================

export function getStoredSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const user = localStorage.getItem(USER_KEY);

  if (!token || !user) {
    return null;
  }

  try {
    return { token, user: JSON.parse(user) };
  } catch {
    clearSession();
    return null;
  }
}

function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Thrown when the token is invalid or expired
export class AuthExpiredError extends Error {
  constructor() {
    super("انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.");
    this.name = "AuthExpiredError";
  }
}

// Thrown when the conversation belongs to someone else
export class ConversationForbiddenError extends Error {
  constructor() {
    super("لا يمكنك الوصول إلى هذه المحادثة. تم بدء محادثة جديدة.");
    this.name = "ConversationForbiddenError";
  }
}

function authHeaders() {
  const session = getStoredSession();

  return session ? { Authorization: `Bearer ${session.token}` } : {};
}

// ================= GUEST CONVERSATIONS =================
// Guests have no server identity, so their conversation list is kept
// only in this browser. The server still checks that each one is a guest conversation.

const GUEST_CONVERSATIONS_KEY = "almusaid_guest_conversations";

export function getGuestConversations() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CONVERSATIONS_KEY)) ?? [];
  } catch {
    return [];
  }
}

export function saveGuestConversation(conversationId, firstMessage) {
  const list = getGuestConversations();
  const existing = list.find((c) => c.conversation_id === conversationId);
  const now = new Date().toISOString();

  const updated = existing
    ? { ...existing, updated_at: now }
    : { conversation_id: conversationId, title: firstMessage, updated_at: now };

  const next = [
    updated,
    ...list.filter((c) => c.conversation_id !== conversationId),
  ].slice(0, 50);

  localStorage.setItem(GUEST_CONVERSATIONS_KEY, JSON.stringify(next));

  return next;
}

export function removeGuestConversation(conversationId) {
  const next = getGuestConversations().filter(
    (c) => c.conversation_id !== conversationId
  );

  localStorage.setItem(GUEST_CONVERSATIONS_KEY, JSON.stringify(next));

  return next;
}

// ================= CONVERSATION HISTORY =================

// Logged-in user's own conversations (from the server)
export async function fetchConversations() {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    headers: authHeaders(),
  });

  if (response.status === 401 || response.status === 403) {
    clearSession();
    throw new AuthExpiredError();
  }

  if (!response.ok) {
    throw new Error("تعذر تحميل المحادثات.");
  }

  const data = await response.json();

  return data.conversations;
}

// Messages of one conversation (server checks ownership; 404 if not yours)
export async function fetchConversationMessages(conversationId) {
  const response = await fetch(
    `${API_BASE_URL}/conversations/${encodeURIComponent(conversationId)}/messages`,
    { headers: authHeaders() }
  );

  if (response.status === 401) {
    clearSession();
    throw new AuthExpiredError();
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("تعذر تحميل المحادثة.");
  }

  const data = await response.json();

  return data.messages;
}

// Delete a conversation (server checks ownership; 404 if not yours)
export async function deleteConversation(conversationId) {
  const response = await fetch(
    `${API_BASE_URL}/conversations/${encodeURIComponent(conversationId)}`,
    { method: "DELETE", headers: authHeaders() }
  );

  if (response.status === 401) {
    clearSession();
    throw new AuthExpiredError();
  }

  // 404: already deleted or not found -> treat as removed
  if (!response.ok && response.status !== 404) {
    throw new Error("تعذر حذف المحادثة.");
  }
}

// ================= AUTH =================

// Arabic messages for backend auth errors
function authErrorMessage(status, fallback) {
  if (status === 401) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (status === 403) return "هذا الحساب غير نشط.";
  if (status === 422) return "تحقق من البريد الإلكتروني وكلمة المرور.";
  return fallback;
}

async function postAuth(path, body, fallbackError) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("تعذر الاتصال بالخادم.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(authErrorMessage(response.status, fallbackError));
  }

  return data;
}

export async function login(email, password) {
  const data = await postAuth(
    "/auth/login",
    { email, password },
    "تعذر تسجيل الدخول."
  );

  saveSession(data.access_token, data.user);

  return data.user;
}

// ================= CHAT =================

export async function sendMessage(
  message,
  location = {}
) {
  const headers = {
    "Content-Type": "application/json",
  };

  // Attach the JWT when the user is logged in
  const session = getStoredSession();

  if (session) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}/chat`,
    {
      method: "POST",

      headers,

      body: JSON.stringify({
        message,

        conversation_id:
          location?.conversation_id ?? null,

        latitude:
          location?.latitude ?? null,

        longitude:
          location?.longitude ?? null,

        location_error:
          location?.location_error ?? null,
      }),
    }
  );

  // Token invalid/expired
  if (session && response.status === 401) {
    clearSession();
    throw new AuthExpiredError();
  }

  if (response.status === 403) {
    const data = await response.json().catch(() => ({}));

    // Conversation belongs to someone else
    if (data.detail === "conversation_forbidden") {
      throw new ConversationForbiddenError();
    }

    // Account inactive
    if (session) {
      clearSession();
      throw new AuthExpiredError();
    }
  }

  if (!response.ok) {
    throw new Error("تعذر الاتصال بالخادم");
  }

  const data = await response.json();

  return data;
}
