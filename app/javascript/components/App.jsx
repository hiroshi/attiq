import {useState, useEffect, useContext, createContext} from 'react';

const SubscriptionsContext = createContext([]);

// https://chatgpt.com/share/678c0d7f-392c-800c-a391-3697982d0e29
function isPWA() {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  // iOS Safari
  if (navigator.standalone) {
    return true;
  }
  return false;
}

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

function Subscribed({ pushSubscription }) {
  const subscriptions = useContext(SubscriptionsContext);
  const [subscription, setSubscription] = useState();

  useEffect(() => {
    if (subscriptions.length > 0) {
      (async () => {
        const sha1ArrayBuffer = await crypto.subtle.digest("SHA-1", (new TextEncoder).encode(pushSubscription.endpoint));
        const sha1 = btoa(String.fromCharCode(...new Uint8Array(sha1ArrayBuffer)));
        const sub = subscriptions.find((sub) => sub.endpoint_sha1 === sha1);
        // console.log(sub);
        setSubscription(sub);
      })();
    }
  }, [subscriptions]);

  const handleUnsubscribe = async (event) => {
    event.preventDefault();

    const unsubscribed = await pushSubscription.unsubscribe();
    console.log({ unsubscribed });

    // TODO: fetch to delete subscription
    const form = event.target;
    fetch(form.action, {
      method: 'delete',
      headers: csrfTokenHeaders(),
    }).then((res) => {
      console.log({ res });
      window.location.reload();
    });
  }

  return (
    <>
      <p>Web push subscription: "{subscription?.name}". It's ready to receive push notifications.</p>
      <form action={`/subscriptions/${subscription?._id}`} onSubmit={handleUnsubscribe}>
        <button type='submit'>unsubscribe</button>
      </form>
    </>
  );
}

function PushNotificationPermission() {
  const [registration, setRegistration] = useState();
  const [pushSubscription, setPushSubscription] = useState();

  // FIXME: must not be async
  useEffect(async () => {
    // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register
    const registration = await navigator.serviceWorker.register("./service-worker.js");
    // console.log({ registration });
    setRegistration(registration);

    // https://developer.mozilla.org/ja/docs/Web/API/PushSubscription
    const pushSubscription = await registration.pushManager.getSubscription();
    // console.log({ subscription });
    setPushSubscription(pushSubscription);
  }, []);

  const handleSubscribe = async (event) => {
    event.preventDefault();

    const result = await window.Notification.requestPermission();

    if (result === "granted") {
      const pubKey = document.getElementsByName("webpush-pubkey")[0].content;
      console.log({ pubKey });
      let pushSubscription = await registration.pushManager.subscribe({
        applicationServerKey: urlBase64ToUint8Array(pubKey),
        userVisibleOnly: true,
      });
      console.log({ pushSubscription });

      const data = {
        endpoint: pushSubscription.endpoint,
        p256dh: arrayBufferToString(pushSubscription.getKey('p256dh')),
        auth: arrayBufferToString(pushSubscription.getKey('auth')),
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
        window.location.reload();
      });
    }
  };

  const subscribeForm = (
    <>
      <p>A web push subscription is required to get notification.</p>
      <form action='/subscriptions' method='post' onSubmit={handleSubscribe}>
        <input type='text' name='subscription[name]' placeholder='name (e.g. WorkMac, iPhone, etc...)' autocomplete="off" />
        <button type='submit'>Subscribe</button>
      </form>
    </>
  );

  return (
    <>
      {
        pushSubscription
        ? <Subscribed {...{ pushSubscription }}/>
        : subscribeForm
      }
    </>
  );
}

function SubscriptionOptions() {
  // const [subscriptions, setSubscriptions] = useState([]);
  const subscriptions = useContext(SubscriptionsContext);

  // useEffect(() => {
  //   fetch('/subscriptions')
  //     .then(res => res.json())
  //     .then(subs => setSubscriptions(subs));
  // }, []);

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

function PwaInstruction() {
  return (
    <>
      <p>Please open as a web app to receive Web Push. </p>
      <p>How to install the web app:</p>
      <ul>
        <li><a href="https://support.google.com/chrome/answer/9658361" target='_blank'>Google Chrome</a></li>
        <li><a href="https://support.apple.com/guide/iphone/iph42ab2f3a7/ios" target='_blank'>iPhone (Home Screen)</a></li>
      </ul>
    </>
  );
}

function PwaApp() {
  return (
    <>
      <PushNotificationPermission />
      <hr/>
      <Message />
    </>
  );
}

export default function App() {
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    fetch('/subscriptions')
      .then(res => res.json())
      .then(setSubscriptions);
  }, []);

  return (
    <SubscriptionsContext.Provider value={subscriptions}>
      { isPWA()
        ? <PwaApp />
        : <PwaInstruction />
      }
      <hr/>
      { subscriptions.length > 0 && <MessageForm /> }
    </SubscriptionsContext.Provider>
  );
}
