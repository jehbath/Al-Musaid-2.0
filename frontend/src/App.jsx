import { useState, useRef } from "react";
import "./App.css";
import "leaflet/dist/leaflet.css";
import { sendMessage as sendApiMessage } from "./services/api";
import MapPicker from "./MapPicker";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [pendingLocationMessage, setPendingLocationMessage] = useState("");
  const [locationRequest, setLocationRequest] = useState(false);
  const [areaRequest, setAreaRequest] = useState(false);
  const [areaInput, setAreaInput] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  
  const [isDarkMode, setIsDarkMode] = useState(false);



  const inputRef = useRef(null);

  /* ---------------- LOCATION ---------------- */

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("المتصفح لا يدعم تحديد الموقع.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        try {
          setLoading(true);
          setError("");

          const response = await sendApiMessage(pendingLocationMessage, {
            latitude,
            longitude,
          });

          setMessages((prev) => [
            ...prev,
            {
              id: Date.now(),
              text: response,
              sender: "assistant",
            },
          ]);

          setPendingLocationMessage("");
          setLocationRequest(false);
        } catch (error) {
          setError("تعذر الاتصال بالخادم. حاول مرة أخرى.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLocationRequest(false);
        setPendingLocationMessage("");

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: "عذرًا، لا أستطيع تحديد أقرب صراف بدون موقعك الحالي. يمكنك كتابة اسم المنطقة وسأبحث فيها.",
            sender: "assistant",
          },
        ]);
      }
    );
  };

  const handleAllowLocation = () => {
    getCurrentLocation();
  };

  const handleDenyLocation = () => {
    setError("");
    setLocationRequest(false);
    setAreaRequest(true);
    setPendingLocationMessage("");

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: "عذرًا، لا أستطيع تحديد أقرب صراف بدون موقعك الحالي. يمكنك كتابة اسم المنطقة أو تحديدها على الخريطة.",
        sender: "assistant",
      },
    ]);
  };

  /* ---------------- VOICE ---------------- */

 
const startListening = () => {
  if (!SpeechRecognition) {
    setError("المتصفح لا يدعم التعرف على الصوت.");
    return;
  }

  setError("");

  const recognition = new SpeechRecognition();

  recognition.lang = "ar-SA";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;

  recognition.onstart = () => {
    setIsListening(true);
     setError("");
  };

  recognition.onresult = (event) => {
    let transcript = "";

    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }

    setMessage(transcript);
  };

  recognition.onerror = () => {
    setError("تعذر التعرف على الصوت. حاول مرة أخرى.");
  };

  recognition.onend = () => {
    setIsListening(false);
  };

  try {
    recognition.start();
  } catch {
    setIsListening(false);
    setError("تعذر بدء التسجيل. حاول مرة أخرى.");
  }
};

  /* ---------------- MESSAGE ---------------- */

  const needsLocation = (text) => {
    const locationWords = [
      "أقرب صراف",
      "اقرب صراف",
      "أقرب ماكينة",
      "اقرب ماكينة",
      "أقرب ATM",
      "اقرب ATM",
    ];

    return locationWords.some((word) =>
      text.toLowerCase().includes(word.toLowerCase())
    );
  };

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();

    if (needsLocation(userMessage)) {
      setError("");

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: userMessage,
          sender: "user",
        },
      ]);

      setPendingLocationMessage(userMessage);
      setLocationRequest(true);
      setMessage("");
      return;
    }

    setError("");

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: userMessage,
        sender: "user",
      },
    ]);

    setMessage("");
    setLoading(true);

    try {
      const response = await sendApiMessage(userMessage);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: response,
          sender: "assistant",
        },
      ]);
    } catch (error) {
      setError("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- NEW CHAT ---------------- */

  const startNewChat = () => {
    setMessages([]);
    setMessage("");
    setError("");
    setLoading(false);
    setLocationRequest(false);
    setAreaRequest(false);
    setAreaInput(false);
    setMapOpen(false);
    setSelectedLocation(null);
    setPendingLocationMessage("");
  };

  return (
    <div className={`app ${isDarkMode ? "dark-mode" : ""}`}>

      {/* ================= SIDEBAR ================= */}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>

        <div className="brand">
          <div className="brand-logo">
            <span>M</span>
          </div>

          <div>
            <h2>MaltBot</h2>
            <p>Your Banking Assistant</p>
          </div>
        </div>

        <button className="new-chat" onClick={startNewChat}>
          <span className="plus">＋</span>
          محادثة جديدة
        </button>

        <div className="history">
          <h3>المحادثات السابقة</h3>

          <button className="history-item active">
            <span className="history-icon">▱</span>
            <span className="history-title">الاستعلام عن الرصيد</span>
            <span className="history-time">10:30 AM</span>
          </button>

          <button className="history-item">
            <span className="history-icon">▱</span>
            <span className="history-title">آخر العمليات</span>
            <span className="history-time">9:15 AM</span>
          </button>

          <button className="history-item">
            <span className="history-icon">▣</span>
            <span className="history-title">التحويلات المالية</span>
            <span className="history-time">أمس</span>
          </button>

          <button className="history-item">
            <span className="history-icon">▣</span>
            <span className="history-title">تغيير كلمة المرور</span>
            <span className="history-time">أمس</span>
          </button>

          <button className="history-item">
            <span className="history-icon">ⓘ</span>
            <span className="history-title">معلومات الحساب</span>
            <span className="history-time">2 يوم</span>
          </button>

          <button className="history-item">
            <span className="history-icon">?</span>
            <span className="history-title">أسئلة عامة</span>
            <span className="history-time">3 يوم</span>
          </button>
        </div>

        <div className="sidebar-bottom">
          
<div className="appearance-option">
  <div className="appearance-info">
    
<span className="appearance-icon">
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
  </svg>
</span>
    <span>الوضع الليلي</span>
  </div>

  
<button
  className={`appearance-switch ${isDarkMode ? "active" : ""}`}
  type="button"
  aria-label="تغيير الوضع الليلي"
  aria-pressed={isDarkMode}
  onClick={() => setIsDarkMode((prev) => !prev)}
>
  <span></span>
</button>


</div>
          <button className="bottom-item">
            <span>⚙</span>
            الإعدادات
          </button>

          <button className="bottom-item">
            <span>↪</span>
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ================= MAIN CHAT ================= */}

     
<main
  className="chat"
  onClick={() => {
    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  }}
>

       
<button
  className="menu-button"
  onClick={() => setSidebarOpen((prev) => !prev)}
  aria-label="فتح القائمة"
 style={{ display: sidebarOpen ? "none" : "flex" }}
>
  ☰
</button>

        {/* HEADER */}

        <header className="chat-header">

          <div className="header-info">
            <h1>MaltBot</h1>

            
          </div>

         

        </header>

        {/* ================= MESSAGES ================= */}

        <section className="messages">

          {messages.length === 0 ? (

            <div className="welcome">

              <div className="welcome-avatar">
                🤖
              </div>

              <h2>مرحباً! 👋</h2>

              <p>
                أنا MaltBot، مساعدك البنكي الذكي
                <br />
                كيف يمكنني مساعدتك اليوم؟
              </p>

              <div className="suggestions">

                <button
                  onClick={() =>
                    setMessage("أريد معرفة رصيدي")
                  }
                >
                  الاستعلام عن الرصيد
                </button>

                <button
                  onClick={() =>
                    setMessage("ما هي آخر العمليات؟")
                  }
                >
                  آخر العمليات
                </button>

                <button
                  onClick={() =>
                    setMessage("أريد إجراء تحويل مالي")
                  }
                >
                  التحويلات المالية
                </button>

              </div>

            </div>

          ) : (

            messages.map((item) => (

              <div
                key={item.id}
                className={`message-row ${item.sender}`}
              >

                <div className="avatar">
                  {item.sender === "assistant" ? "🤖" : "●"}
                </div>

                <div className="message-content">

                  <div className="message">
                    {item.text}
                  </div>

                  <span className="message-time">
                    {new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>

                </div>

              </div>

            ))

          )}

          {/* LOCATION REQUEST */}

          {locationRequest && (
            <div className="special-card">

              <p>
                📍 لتحديد أقرب صراف، الرجاء السماح
                باستخدام موقعك الحالي.
              </p>

              <p>هل تسمح بمشاركة موقعك؟</p>

              <div className="special-actions">

                <button onClick={handleAllowLocation}>
                  السماح بالموقع
                </button>

                <button
                  className="secondary-button"
                  onClick={handleDenyLocation}
                >
                  عدم السماح
                </button>

              </div>

            </div>
          )}

          {/* AREA REQUEST */}

          {areaRequest && (
            <div className="special-card">

              <p>📍 كيف تريد تحديد المنطقة؟</p>

              <div className="special-actions">

                <button
                  onClick={() => {
                    setAreaRequest(false);
                    setAreaInput(true);

                    setTimeout(() => {
                      inputRef.current?.focus();
                    }, 100);
                  }}
                >
                  ✏️ كتابة اسم المنطقة
                </button>

                <button
                  onClick={() => {
                    setAreaRequest(false);
                    setMapOpen(true);
                  }}
                >
                  🗺️ تحديد من الخريطة
                </button>

              </div>
            </div>
          )}

          {/* MAP */}

          {mapOpen && (
            <div className="map-container">

              <p>📍 اضغطي على المكان الذي تريدينه على الخريطة</p>

              <MapPicker
                onLocationSelect={(location) => {
                  setSelectedLocation(location);
                  setMapOpen(false);
                }}
              />

            </div>
          )}

          {/* SELECTED LOCATION */}

          {selectedLocation && (
            <div className="special-card">

              📍 تم تحديد الموقع بنجاح

              <br />

              جاهز لإرسال الموقع.

              <button
                className="confirm-button"
                onClick={() => {
                  console.log(
                    "الموقع المؤكد:",
                    selectedLocation
                  );
                }}
              >
                تأكيد الموقع
              </button>

            </div>
          )}

          {loading && (
            <div className="message-row assistant">

              <div className="avatar">🤖</div>

              <div className="message-content">

                <div className="message loading">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>

              </div>

            </div>
          )}

          {error && (
            <div className="error">
              {error}
            </div>
          )}

        </section>

        {/* ================= INPUT ================= */}

 <div className="input-area">
<div className="input-box">

  <button
    className="attach-button"
    type="button"
    aria-label="إرفاق ملف"
  >
    <svg
      viewBox="0 0 24 24"
      width="23"
      height="23"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.4 11.1-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
    </svg>
  </button>

  <input
    type="text"
    placeholder={
      areaInput
        ? "اكتب اسم المنطقة..."
        : "اكتب رسالتك هنا..."
    }
    ref={inputRef}
    value={message}
    onChange={(e) => setMessage(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
      }
    }}
  />

  {message.trim() ? (
    <button
      className="send-button"
      type="button"
      onClick={sendMessage}
      disabled={loading}
      aria-label="إرسال"
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 2 11 13" />
        <path d="m22 2-7 20-4-9-9-4Z" />
      </svg>
    </button>
  ) : (
    <button
      className={`voice-button ${isListening ? "recording" : ""}`}
      type="button"
      onClick={startListening}
      aria-label="التحدث"
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0" />
        <path d="M12 17v5" />
        <path d="M8 22h8" />
      </svg>
    </button>
  )}

</div>


          

          <p className="input-note">
            MaltBot قد يحتاج إلى التحقق من المعلومات قبل تقديم إجابة نهائية.
          </p>

        </div>

      </main>
    </div>
  );
}

export default App;