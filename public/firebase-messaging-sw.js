importScripts("https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD8HAQ6KGgl9azVsMR2mrwhx8eI6M0Su84",
  authDomain: "typebot-leads-notifications.firebaseapp.com",
  projectId: "typebot-leads-notifications",
  storageBucket: "typebot-leads-notifications.firebasestorage.app",
  messagingSenderId: "757091714627",
  appId: "1:757091714627:web:adc7f3e66bc806ccfbf6f6",
  measurementId: "G-7WW64QTMX4"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body,
      icon: payload.notification.image || "https://cdn-icons-png.flaticon.com/512/992/992700.png"
    }
  );
});
