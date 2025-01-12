// Add a service worker for processing Web Push notifications:
//
// self.addEventListener("push", async (event) => {
//   const { title, options } = await event.data.json()
//   event.waitUntil(self.registration.showNotification(title, options))
// })
self.addEventListener("push", async (event) => {
  console.log("push");
  console.log({ event });
  // console.log({ text: await event.data.text() });
  const text = await event.data.text();
  event.waitUntil(self.registration.showNotification("A push notification", {body: text}));
})

self.addEventListener("notificationclick", function(event) {
  console.log("notificationclick");
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // const path = event.notification.data.path
      const path = '/';

      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i]
        let clientPath = (new URL(client.url)).pathname

        if (clientPath == path && "focus" in client) {
          return client.focus()
        }
      }

      if (clients.openWindow) {
        console.log(`openWindow(${path})`)
        return clients.openWindow(path)
      }
    })
  )
})

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});
