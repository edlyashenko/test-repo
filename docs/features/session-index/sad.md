---
target_surfaces: [backend-service]
---

# SAD - session-index (TEST REPOSITORY)

Індекс будується в адаптері `lib/claude/index.js` функцією `listSessions` лише з `readdir` і `lstat`, без читання вмісту файлів. Маршрут `/api/sessions` у `server.js` віддає JSON.
