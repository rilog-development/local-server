import {AnalyticsData, UpdateAnalytics} from "../types/analytics";
import JsonService, {IJsonService} from "./json.service";
import path from "path";
import {getSlugName} from "../utils";
import fs from "fs/promises";

interface IAnalyticsService {
    update: (data: UpdateAnalytics, fileNameBase: string) => void;
    getAnalytics: () => void;
}
class AnalyticsService implements IAnalyticsService {
    jsonService: IJsonService;

    constructor() {
        this.jsonService = new JsonService();
    }

    async update(data: UpdateAnalytics, fileNameBase: string){
        try{
            const fileName = `data-${fileNameBase}`;
            const folderPath = path.join(__dirname, "../../../_analytics", getSlugName(data.appName));
            const filePath = path.join(folderPath, fileName);

            try {
                await fs.access(folderPath);
            } catch (_err) {
                await fs.mkdir(folderPath, { recursive: true });
            }

            const analyticsData = await this.jsonService.readFile(filePath);

            if (analyticsData) {
                // pass additional analyticsData
                this.calculateAnalytics();
            }

            this.calculateAnalytics();

            await this.jsonService.writeFile(data, filePath);


        } catch (_err) {
            console.log("Error in AnalyticsService: update failure.");
        }
    }

    calculateAnalytics(){}

    getAnalytics() {

    }
}

export default AnalyticsService;
