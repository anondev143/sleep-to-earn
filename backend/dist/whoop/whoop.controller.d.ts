import { WhoopService } from './whoop.service';
type WhoopEventBody = {
    user_id: number;
    id: string | number;
    type: string;
    trace_id?: string;
};
export declare class WhoopController {
    private readonly service;
    constructor(service: WhoopService);
    handle(signature: string, timestamp: string, body: WhoopEventBody): Promise<string>;
}
export {};
