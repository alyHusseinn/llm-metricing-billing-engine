import app from "./app";
import { env } from "./utils/env";

const PORT = env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Listening at port ${PORT}`);
});
