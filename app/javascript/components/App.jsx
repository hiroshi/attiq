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

function arrayBufferToString(arrayBuffer) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer))).replace(/\+/g, '-').replace(/\//g, '_');
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
      // console.log({ p256dh: subscription.getKey('p256dh'), auth: subscription.getKey('auth') });

      const data = {
        endpoint: subscription.endpoint,
        p256dh: arrayBufferToString(subscription.getKey('p256dh')),
        auth: arrayBufferToString(subscription.getKey('auth')),
      }
      console.log(data);

      const form = event.target;
      const formData = new FormData(form);
      formData.set('subscription[endpoint]', data.endpoint);
      formData.set('subscription[p256dh]', data.p256dh);
      formData.set('subscription[auth]', data.auth);

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
    <form action='/subscriptions' method='post' onSubmit={handleSubmit}>
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

function ReadClipboardButton({setPayload}) {
  const handleClick = async () => {
    const json = {};

    const items = await navigator.clipboard.read();
    for (const item of items) {
      console.log({item});
      for (const type of item.types) {
        const blob = await item.getType(type);
        const text = await blob.text()
        console.log({ type, text });
        json[type] = text;
      }
    }
    console.log(json);
    // setText(JSON.stringify(json));
    setPayload(json);
  };

  return (
    <button onClick={handleClick}>Read clipboard</button>
  );
}

function MessageForm() {
  const [text, setText] = useState("");
  const [payload, setPayload] = useState({});

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.target;
    const method = form.method;
    const headers = csrfTokenHeaders();
    const body = new FormData(form);

    Object.entries(payload).forEach(([key, value]) => {
      body.set(`payload[${key}]`, value);
    });

    await fetch(form.action, { method, body, headers });
  };

  const handlePayload = (payload) => {
    setPayload(payload);
    setText(payload['text/plain']);
  };

  return (
    <>
      <form action='/messages' method='POST' onSubmit={handleSubmit}>
        <select name='subscription_id'>
          <SubscriptionOptions />
        </select>
        <input type='text' name='payload[text/plain]' value={text} onChange={(e) => setText(e.target.value)} />
        <button type='submit'>Post</button>
      </form>

      <ReadClipboardButton setPayload={handlePayload}/>
    </>
  )
}

function Message() {
  const [text, setText] = useState(<></>);

  useEffect(() => {
    const handleServiceWorkerMessage = (event) => {
      // if (event.data?.action === 'copyToClipboard') {
      //   const text = event.data.text;
      // }
      // https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent
      console.log(event);
      const components = Object.entries(event.data.payload).map(([key, value]) => {
        // console.log(`Key: ${key}, Value: ${value}`);
        try {
          const url = new URL(value);
          return (<p>{key}: <a href={url} target="_blank">{value}</a></p>);
        } catch {
          return (<p>{key}: {value}</p>);
        }
      });
      setText(components);
    };
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  });


  return (
    <p>{text}</p>
  );
};


export default function App() {
  return (
    <>
      <PushNotificationPermission />
      <hr/>
      <MessageForm />
      <hr/>
      <Message />
    </>
  );
}
