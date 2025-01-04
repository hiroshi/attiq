function csrfTokenHeaders() {
  const token = document
    .querySelector("meta[name=csrf-token]")
    .getAttribute("content");
  return {
    "X-CSRF-Token": token,
    "Content-Type": "application/json",
  };
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function PushNotificationPermission() {
  const handleClick = async () => {
    const registration = await navigator.serviceWorker.register("./service-worker.js");

    const result = await window.Notification.requestPermission();

    if (result === "granted") {
      console.log({ registration });
      const pubKey = document.getElementsByName("webpush-pubkey")[0].content;
      console.log({ pubKey });
      let subscription;
      subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // const oldKey = subscription.getKey("p256dh");
        // console.log({ oldKey });
        // console.log(subscription.toJSON());
        const unsubscribed = await subscription.unsubscribe();
        console.log({ unsubscribed });
      }
      // console.log({ keyChanged: urlBase64ToUint8Array(pubKey) !== oldKey });
      subscription = await registration.pushManager.subscribe({
        applicationServerKey: urlBase64ToUint8Array(pubKey),
        userVisibleOnly: true,
      });
      console.log({ subscription });
      const endpoint = subscription.endpoint;
      console.log(endpoint);

      fetch(`/webpush_subscriptions`, {
        method: "POST",
        headers: csrfTokenHeaders(),
        body: JSON.stringify({ subscription: { endpoint } }),
      }).then((res) => {
        console.log({ res });
      });
    }
  };

  return <button onClick={handleClick}>Enable push notification</button>;
}

export default function App() {
  return (
    <>
      <PushNotificationPermission />
    </>
  );
}