// Add a service worker for processing Web Push notifications:
//
// self.addEventListener("push", async (event) => {
//   const { title, options } = await event.data.json()
//   event.waitUntil(self.registration.showNotification(title, options))
// })
self.addEventListener("push", async (event) => {
  // https://developer.mozilla.org/en-US/docs/Web/API/PushEvent
  // https://developer.mozilla.org/en-US/docs/Web/API/PushMessageData
  console.log({ PushEvent: event });
  const data = await event.data.json();
  const body = data['text/plain'];
  event.waitUntil(
    // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
    self.registration.showNotification(
      "A push notification",
      { body, data },
    )
  );
})

self.addEventListener("notificationclick", async function(event) {
  console.log("notificationclick:", { event });
  // client.postMessage("notificationclick");
  const { data } = event.notification;
  event.notification.close()

  // const path = event.notification.data.path
  const path = '/';

  // https://developer.mozilla.org/en-US/docs/Web/API/Clients
  // if (clients.openWindow) {
  //   console.log(`openWindow(${path})`)
  //   const clientWindow = await clients.openWindow(path);
  //   clientWindow.postMessage({ payload: data });
  // }

  event.waitUntil(
    // https://developer.mozilla.org/en-US/docs/Web/API/Clients/matchAll
    clients.matchAll({ type: "window" }).then(async (clientList) => {

      console.log({ clientList });
      if (clientList.length === 0) {
        if (clients.openWindow) {
          console.log(`openWindow(${path})`)
          const clientWindow = await clients.openWindow(path);
          clientWindow.postMessage({ payload: data });
        }
      } else {
        for (let i = 0; i < clientList.length; i++) {
          let client = clientList[i]

          client.postMessage({ payload: data });

          // let clientPath = (new URL(client.url)).pathname;
          // if (clientPath == path && "focus" in client) {
          //   return client.focus()
          // }
          if ((i + 1) === clientList.length) {
            return client.focus();
          }
        }
      }
    })
  )
})

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});
