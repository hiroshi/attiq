import {useState, useEffect} from 'react';

function csrfTokenHeaders() {
  const token = document
    .querySelector("meta[name=csrf-token]")
    .getAttribute("content");
  return {
    "X-CSRF-Token": token,
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
  const handleSubmit = async (event) => {
    event.preventDefault();

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


      const form = event.target;
      const formData = new FormData(form);
      formData.set('subscription[endpoint]', endpoint);

      fetch(form.action, {
        method: form.method,
        headers: csrfTokenHeaders(),
        body: formData,
      }).then((res) => {
        console.log({ res });
      });
    }
  };

  return (
    <form action='/webpush_subscriptions' method='post' onSubmit={handleSubmit}>
      <input type='text' name='subscription[name]' placeholder='name (e.g. WorkMac, iPhone, etc...)' />
      <button type='submit'>Enable push notification</button>
    </form>
  );
}

function SubscriptionOptions() {
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    fetch('/subscriptions')
      .then(res => res.json())
      .then(subs => setSubscriptions(subs));
  }, []);

  return subscriptions.map((sub) => {
    return (<option value={sub._id}>{sub.name}</option>)
  });
}

function MessageForm() {
  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.target;
    const method = form.method;
    const body = new FormData(form);
    const headers = csrfTokenHeaders();

    await fetch(form.action, { method, body, headers });
  };

  return (
    <form action='/messages' method='POST' onSubmit={handleSubmit}>
      <select name='subscription_id'>
        <SubscriptionOptions />
      </select>
      <input type='text' name='payload' />
      <button type='submit'>Post</button>
    </form>
  )
}

export default function App() {
  return (
    <>
      <PushNotificationPermission />
      <hr/>
      <MessageForm />
    </>
  );
}
