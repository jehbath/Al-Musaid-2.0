import { useState,useRef } from "react";
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
 // console.log("Sidebar open:", sidebarOpen);لاختبار القائمة الجانبية في الكونسول
  const [pendingLocationMessage, setPendingLocationMessage] = useState("");
  const [locationRequest, setLocationRequest] = useState(false);
  const [areaRequest, setAreaRequest] = useState(false);
  const [areaInput, setAreaInput] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const inputRef = useRef(null);
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
//تعبت
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
  console.log("areaReqest must true");
  setPendingLocationMessage("");

  setMessages((prev) => [
    ...prev,
    {
      id: Date.now(),
      text: "عذرًا، لا أستطيع تحديد أقرب صراف بدون موقعك الحالي. يمكنك كتابة اسم المنطقة أو تحديدها على الخريطة.",
      sender: "assistant",
    },
  ]);
}
  

  const startListening = () => {
  if (!SpeechRecognition) {
    setError("المتصفح لا يدعم التعرف على الصوت.");
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "ar-SA";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    setIsListening(true);
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    setMessage(transcript);
  };

  recognition.onerror = () => {
    setError("تعذر التعرف على الصوت. حاول مرة أخرى.");
    setIsListening(false);
  };

  recognition.onend = () => {
    setIsListening(false);
  };

  recognition.start();
};

  const getBotReply = (text) => {
    const question = text.toLowerCase();

    if (
      question.includes("خدمات") ||
      question.includes("الخدمات المصرفية")
    ) {
      return "نقدم مجموعة من الخدمات المصرفية مثل فتح الحسابات، الاستفسار عن الرصيد، التحويلات والخدمات الإلكترونية.";
    }

    if (
      question.includes("حساب") ||
      question.includes("حسابي")
    ) {
      return "يمكنك الاستفسار عن حسابك من خلال خدمة العملاء أو القنوات المصرفية الإلكترونية المعتمدة.";
    }

    if (
      question.includes("رصيد") ||
      question.includes("الرصيد")
    ) {
      return "للاستفسار عن رصيد حسابك، يرجى استخدام القنوات المصرفية الرسمية أو التواصل مع خدمة العملاء.";
    }

    if (
      question.includes("تحويل") ||
      question.includes("تحويلات")
    ) {
      return "يمكنك إجراء التحويلات المصرفية من خلال الخدمات الإلكترونية المتاحة حسب نوع حسابك.";
    }

    if (
      question.includes("مرحبا") ||
      question.includes("السلام") ||
      question.includes("هلا")
    ) {
      return "مرحباً بك 👋 أنا MaltBot، كيف يمكنني مساعدتك؟";
    }

    return "أهلاً بك 👋 فهمت سؤالك. يمكنني مساعدتك في الاستفسارات المتعلقة بالخدمات المصرفية والحسابات والتحويلات.";
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

// دالة التصفير

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
    <div className="app" dir="rtl">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="logo">
          <div className="logo-icon">M</div>

          <div>
            <h2>MaltBot</h2>
            <span>المساعد الذكي</span>
          </div>
        </div>

        <button
          className="new-chat"
          onClick={startNewChat}
        >
          + محادثة جديدة
        </button>

        <div className="history">
          <h3>المحادثات</h3>

          <div className="history-item">
            لا توجد محادثات سابقة
          </div>
        </div>
      </aside>

      <main className="chat">
        <button
  className={`menu-button ${sidebarOpen ? "sidebar-open" : ""}`}
  onClick={() => setSidebarOpen((prev) => !prev)}
  aria-label="فتح أو إغلاق القائمة"
>
  ☰
</button>
        <header className="chat-header">
 
          <div>
            <h1>MaltBot</h1>
            <p>المساعد الذكي للخدمات المصرفية</p>
          </div>

          <div className="status">
            <span></span>
            متصل
          </div>
        </header>

        <section className="messages">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-icon">M</div>

              <h2>مرحباً بك في MaltBot 👋</h2>

              <p>
                أنا مساعدك الذكي. اكتب سؤالك وسأساعدك.
              </p>

              <div className="suggestions">
                <button
                  onClick={() =>
                    setMessage("ما هي الخدمات المصرفية المتاحة؟")
                  }
                >
                  الخدمات المصرفية
                </button>

                <button
                  onClick={() =>
                    setMessage("كيف أستفسر عن حسابي؟")
                  }
                >
                  الاستفسار عن الحساب
                </button>

                <button
                  onClick={() =>
                    setMessage("أريد معرفة المزيد")
                  }
                >
                  أريد معرفة المزيد
                </button>
              </div>
            </div>
          ) : (
            messages.map((item) => (
              <div
                key={item.id}
                className={`message ${item.sender}`}
              >
                {item.text}
              </div>
            ))
          )}



          {locationRequest && (
  <div className="location-request">
    <div className="location-request-text">
      📍 لتحديد أقرب صراف، الرجاء السماح باستخدام موقعك الحالي.
      <br />
      هل تسمح بمشاركة موقعك؟
    </div>

    <div className="location-actions">
      <button onClick={handleAllowLocation}>
        السماح بالموقع
      </button>

      <button
        className="deny-button"
        onClick={handleDenyLocation}
      >
        عدم السماح
      </button>
    </div>
  </div>
)}
{areaRequest && (
  <div className="area-request">
    <p>📍 كيف تريد تحديد المنطقة؟</p>

    <button 
    onClick={() =>{
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
)}
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
{selectedLocation && (
  <div className="selected-location">
    📍 تم تحديد الموقع بنجاح
    <br />
    جاهز لإرسال الموقع.
  <button
      onClick={() => {
        
        console.log("الموقع المؤكد:", selectedLocation);
      }}
    >
      تأكيد الموقع
    </button>
  </div>
)}
          
          {loading && (
  <div className="message assistant loading">
    MaltBot يكتب...
  </div>
)}
{error && (
  <div className="message error">
    {error}
  </div>
)}
        </section>

        <div className="input-area">
          <div className="input-box">
            <input
              type="text"
              placeholder={areaInput ? "اكتب اسم المنطقة..." : "اكتب رسالتك هنا..."}
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
            />
<button
  type="button"
  className="voice-button"
  onClick={startListening}
>
  {isListening ? "🔴" : "🎤"}
</button>

           <button
  className="send-button"
  onClick={sendMessage}
  disabled={loading}
>
  {loading ? "جاري الإرسال..." : "إرسال"}
</button>
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