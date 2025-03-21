## Running React on Replit

[React](https://reactjs.org/) is a popular JavaScript library for building user interfaces.

[Vite](https://vitejs.dev/) is a blazing fast frontend build tool that includes features like Hot Module Reloading (HMR), optimized builds, and TypeScript support out of the box.

Using the two in conjunction is one of the fastest ways to build a web app.

### Getting Started
- Hit run
- Edit [App.jsx](#src/App.jsx) and watch it live update!

By default, Replit runs the `dev` script, but you can configure it by changing the `run` field in the [configuration file](#.replit). Here are the vite docs for [serving production websites](https://vitejs.dev/guide/build.html)

### Typescript

Just rename any file from `.jsx` to `.tsx`. You can also try our [TypeScript Template](https://replit.com/@replit/React-TypeScript)

## المزامنة بين الأجهزة

يدعم التطبيق المزامنة بين الأجهزة المختلفة (الكمبيوتر والهواتف) باستخدام Firebase كخدمة استضافة بينما يحتفظ بالتخزين المحلي للعمل دون اتصال. لاستخدام هذه الميزة:

1. قم بإنشاء مشروع Firebase من [console.firebase.google.com](https://console.firebase.google.com)
2. قم بتفعيل خدمة Firestore Database
3. احصل على بيانات تكوين Firebase وقم بإضافتها في ملفي `src/firebase.js` و `src/syncManager.js`
4. قم بتشغيل التطبيق على الأجهزة المختلفة واستخدم نفس معلومات تسجيل الدخول

ستتم المزامنة تلقائيًا كل دقيقة عند وجود اتصال بالإنترنت، أو يمكنك الضغط على زر "مزامنة الآن" من شاشة الحالة.
