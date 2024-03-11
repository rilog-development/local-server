import fs from "fs/promises";
import path from "path";
import { SaveEvents } from "../types/events";
import { getSlugName } from "../utils";
import { formatDate, formatTimestamp } from "../utils/date";
import {getEventRequestStatus, getEventTypeLabel} from "../utils/events";


export interface IEventsServis {
    saveEvents:  (data: SaveEvents) => Promise<boolean>;
    decodeData: (data: string) => any;
}

class EventsService implements IEventsServis {
    async saveEvents({ appName, params, events, uToken, fileFormat }: SaveEvents): Promise<boolean> {

        const currentDate = new Date();
        const folderPath = path.join(__dirname, "../../../logs", getSlugName(appName));
        const filePath = path.join(folderPath, `logs-${formatDate(currentDate)}-${uToken}.${fileFormat}`);

        try{

            try {
                await fs.access(folderPath);
            } catch (_err) {
                await fs.mkdir(folderPath, { recursive: true });
            }

            try {
                await fs.access(filePath);
                await this.appendDataToFile(filePath, events);
            } catch (_err) {
                const fileContent = this.generateLogHeader({ appName, params, uToken, date: formatDate(currentDate, true)}) + this.getFormatedEvents(events);
                await fs.writeFile(filePath, fileContent);
            }
        } catch (_err) {
            return false;
        }

        return true;

    }

    decodeData(data: string) {
        return JSON.parse(data);
    }

    private async appendDataToFile(filePath: string, events: SaveEvents["events"]) {
        await fs.appendFile(filePath, this.getFormatedEvents(events));
    }

    private generateLogHeader({ appName, params, uToken, date}: Partial<SaveEvents> & { date: string }) {
        return `App: ${appName}\nConnection: ${uToken}\nCreated at: ${date}\n ${this.getFormatedParams(params)}${this.getDivider()}`;
    }

    private getFormatedParams(params: Record<string, string> | undefined) {
        if (!params) return '';

        let paramsStr = `Params:\n`;

        Object.keys(params).map((key) => {
            paramsStr += `${key}: ${params[key]}\n`;
        });

        return paramsStr;
    }

    private getDivider() {
        return `=====================\n`;
    }

    private getFormatedEvents(events: SaveEvents["events"]) {
        let eventsRow = "";

        events.forEach((event) => {
            eventsRow += `[${formatTimestamp(event.date)}] [${getEventTypeLabel(event.type)}${getEventRequestStatus(event)}] Data: ${JSON.stringify(event.data)} Location: ${event.location.href} \n`;
        });

        return eventsRow;
    }
}

export default EventsService;
