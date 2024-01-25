import { Application } from "express";
import eventsRoutes from "./events.routes";

export default class Routes {
    constructor(app: Application) {
        app.use("/api", eventsRoutes);
    }
}