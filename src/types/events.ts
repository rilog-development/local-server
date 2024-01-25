import { IRilogEventItem } from "./rilog";

export enum FileFormats {
    TXT = "txt", 
}

export interface SaveEvents {
    appName: string;
    uToken: string;
    fileFormat: FileFormats,
    events: IRilogEventItem[]
}