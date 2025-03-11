import {useState, useEffect, useContext, createContext, useMemo} from 'react';
import {Temporal} from '@js-temporal/polyfill';
window.Temporal = Temporal;

// Helper functions
function autoLinks(text) {
  try {
    const url = new URL(text);
    return (<a href={url} target="_blank">{text}</a>);
  } catch (error) {
    return text;
  }
}

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

async function findCurrentSubscription(subscriptions, pushSubscription) {
  const sha1ArrayBuffer = await crypto.subtle.digest("SHA-1", (new TextEncoder).encode(pushSubscription.endpoint));
  const sha1 = btoa(String.fromCharCode(...new Uint8Array(sha1ArrayBuffer)));
  return subscriptions.find((sub) => sub.endpoint_sha1 === sha1);
}

// Contexts
const AppContext = createContext({
  currentUser: undefined,
  subscriptions: [],
  pushSubscription: undefined,
  setPushSubscription: undefined
});

// Components
function Subscribed() {
  const { subscriptions, pushSubscription } = useContext(AppContext);
  const [subscription, setSubscription] = useState();

  useEffect(() => {
    if (subscriptions.length > 0) {
      (async () => {
        setSubscription(await findCurrentSubscription(subscriptions, pushSubscription));
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
      <p title="It's ready to receive push notifications.">Web push subscription: "{subscription?.name}"</p>
      <form action={`/subscriptions/${subscription?._id}`} onSubmit={handleUnsubscribe}>
        <button type='submit'>unsubscribe</button>
      </form>
    </>
  );
}

function PushNotificationPermission() {
  const [registration, setRegistration] = useState();
  const { pushSubscription, setPushSubscription } = useContext(AppContext);


  // FIXME: must not be async
  useEffect(async () => {
    // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register
    const registration = await navigator.serviceWorker.register("/service-worker.js");
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
  const { subscriptions, pushSubscription } = useContext(AppContext);
  const [currentSubscription, setCurrentSubscription] = useState();

  useEffect(() => {
    if (subscriptions.length > 0 && pushSubscription) {
      (async () => {
        setCurrentSubscription(await findCurrentSubscription(subscriptions, pushSubscription));
      })();
    }
  }, [subscriptions, pushSubscription]);

  return subscriptions.map((sub) => {
    let text = sub.name;
    if (currentSubscription && sub._id == currentSubscription._id) {
      text += " (this)";
    }
    return (<option value={sub._id}>{text}</option>)
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

function Message({ message_id }) {
  const [message, setMessage] = useState();
  const url = message?.payload?.['url'];
  const title = message?.payload?.['title'];
  const text = message?.payload?.['text/plain'];

  useEffect(() => {
    fetch(`/messages/${message_id}`, {
      headers: {"Accept": "application/json"},
    }).then(res => res.json())
      .then(setMessage);
  }, []);

  return (
    <>
      <a href='/'>{'[ <- ]'}</a>
      <hr/>
      {
        (url && title)
          ? <a href={url} target='_blank'>{title}</a>
        : autoLinks(text)
      }
    </>
  );
}

function MessageForm({ parent_id }) {
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

    fetch(form.action, { method, body, headers })
      .then(res => {
        if (res.ok) {
          // setText('');
          window.location.reload();
        }
      });
  };

  const handlePayload = (payload) => {
    setPayload(payload);
    setText(payload['text/plain']);
  };

  return (
    <>
      <form action='/messages' method='POST' onSubmit={handleSubmit}>
        { parent_id && <input type='hidden' name='parent_id' value={parent_id} /> }
        To: <input type='email' name='email' placeholder='email or blank(yourself)' />
        <br/>
        <select name='subscription_id'>
          <option value=''>No push</option>
          <SubscriptionOptions />
        </select>
        <input type='text' name='payload[text/plain]' value={text} onChange={(e) => setText(e.target.value)} autocomplete="off" />
        <button type='submit'>Post</button>
      </form>

      <ReadClipboardButton setPayload={handlePayload}/>
    </>
  )
}

function PushMessage() {
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
      <PushMessage />
    </>
  );
}

function LoginForm() {
  const token = useMemo(() => csrfTokenHeaders()['X-CSRF-Token']);

  return (
    <form action='/auth/google_oauth2' method='post'>
      <input type='hidden' name='authenticity_token' value={token} />
      <button>Login with Google</button>
    </form>
  )
}

function CurrentUser({ children }) {
  const { currentUser } = useContext(AppContext);
  const token = useMemo(() => csrfTokenHeaders()['X-CSRF-Token']);

  const LogoutForm = () => {
    return (
      <form action='/session' method='post'>
        <input type='hidden' name='authenticity_token' value={token} />
        <input type='hidden' name='_method' value='delete' />
        <button type='submit'>Logout</button>
      </form>
    );
  };

  return (
    currentUser
      ? (
        <>
          <p>user: {currentUser.email}</p>
          <LogoutForm />
          {children}
        </>
      )
      : <LoginForm />
  );
}

function MessageItem({ message }) {
  const { currentUser } = useContext(AppContext);
  const title = message.payload['title'];
  const text = message.payload['text/plain'];
  const [ack, setAck] = useState(message.ack);

  const handleAck = (event) => {
    const ack = event.target.checked;
    // console.log(event.target.checked);
    fetch(`/messages/${message._id}/ack`,{
      method: 'PATCH',
      headers: {...csrfTokenHeaders(), "Content-Type": "application/json"},
      body: JSON.stringify({ ack })
    }).then(res => {
      if(res.ok) {
        setAck(ack);
      }
    });
  };

  let other_user = null;
  if (currentUser._id != message.receiver._id) {
    other_user = (
      <>
        {`(to ${message.receiver.email})`}
        <label>
          <input type='checkbox' checked={message.ack} disabled />
          ack
        </label>
      </>
    );
  } else if (currentUser._id != message.sender._id) {
    other_user = (
      <>
        {`(from ${message.sender.email})`}
        <label>
          <input type='checkbox' onChange={handleAck} checked={ack}/>
          ack
        </label>
      </>
    );
  }

  const handleDelete = (event) => {
    fetch(`/messages/${message._id}`, {
      method: 'delete',
      headers: csrfTokenHeaders(),
    }).then(res => {
      window.location.reload();
    });
  };

  const instant = Temporal.Instant.from(message.created_at);
  const zonedDateTime = instant.toZonedDateTimeISO(Temporal.Now.timeZoneId());
  const plainDate = zonedDateTime.toPlainDate();

  return (
    <span>
      <span title={zonedDateTime.toString()}>{plainDate.toString()}</span>&nbsp;
      <a href={`/messages/${message._id}`}>{title || text}</a> {" "}
      {other_user} {" "}
      <button onClick={handleDelete}>❌</button>
      { message.comments_count > 0 && <span>({message.comments_count} comments)</span> }
    </span>
  );
}

function Messages({ parent_id }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const parentId = parent_id ? `?parent_id=${parent_id}` : '';
    fetch(`/messages${parentId}`)
      .then(res => res.json())
      .then(setMessages);
  }, []);

  return (
    <>
      <ul>
        { messages.map(message => <li><MessageItem {...{message}} /></li>) }
      </ul>
    </>
  )
}

export default function App() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [pushSubscription, setPushSubscription] = useState();
  const [currentUser, setCurrentUser] = useState();

  useEffect(() => {
    fetch('/current_user')
      .then(res => {
        if (res.status === 200) {
          return res.json()
        } else {
          return null;
        }
      })
      .then(setCurrentUser)
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetch('/subscriptions')
        .then(res => res.json())
        .then(setSubscriptions);
    }
  }, [currentUser]);

  const pathname = window.location.pathname;
  // console.log(pathname);
  const message_id = pathname.match(/\/messages\/(.*)/)?.[1];

  return (
    <>
      <AppContext.Provider value={{ currentUser, subscriptions, pushSubscription, setPushSubscription }}>
        <CurrentUser>
          <hr/>
          { isPWA()
            ? <PwaApp />
            : <PwaInstruction />
          }
          <hr/>
          { message_id && <><Message {...{ message_id }} /><br/><br/></> }
          <h3>{ message_id ? 'Comments:' : 'Messages:' }</h3>
          { subscriptions.length > 0 && <MessageForm parent_id={message_id} /> }
          <Messages parent_id={message_id} />
        </CurrentUser>
      </AppContext.Provider>
    </>
  );
}
