import fs from "fs/promises";

export interface IJsonService {
    writeFile: <T>(data: T, filePath: string) => Promise<boolean>,
    readFile: <T>(filePath: string) => Promise<T | null>,
    deleteFile: (filePath: string) => Promise<boolean>
}

class JsonService implements IJsonService{
    async writeFile<T>(data: T, filePath: string) {
        const jsonData = JSON.stringify(data);

        try {
            await fs.writeFile(filePath, jsonData);
            return true;
        } catch (err) {
            console.error('Error creating JSON file:', err);
            return false;
        }
    }

    async readFile(filePath: string) {

        try {
            const data = await fs.readFile(filePath, 'utf8');
            const jsonData = JSON.parse(data);

            return jsonData;
        } catch (err) {
            console.error('Error reading JSON file:', err);
            return null;
        }
    }

    async deleteFile(filePath: string) {
        try {
            await fs.unlink(filePath);
            return true;
        } catch (err) {
            console.error('Error deleting JSON file:', err);
            return false;
        }
    }
}

export default JsonService;
