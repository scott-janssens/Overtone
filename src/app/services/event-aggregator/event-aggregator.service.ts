import { Injectable } from "@angular/core";

class Callback {
    readonly key: number;
    readonly func: (payload: any, data: any) => void;
    readonly data: any;

    constructor(key: number, func: (payload: any, data: any) => void, data: any) {
        this.key = key;
        this.func = func;
        this.data = data;
    }
}

@Injectable({
    providedIn: "root"
})
export class EventAggregator {
    private _lastId: number = 0;
    private _subscriptions: Map<string, Map<number, Callback>> = new Map<string, Map<number, Callback>>();

    public subscribe(event: string, func: (payload: any, data: any) => void, data: any = null): number {
        let eventMap = this._subscriptions.get(event);

        if (eventMap === undefined) {
            eventMap = new Map<number, Callback>();
            this._subscriptions.set(event, eventMap)
        }

        const callback = new Callback(++this._lastId, func, data);
        eventMap.set(callback.key, callback);

        return callback.key;
    }

    public unsubscribe(key: number): void {
        for (let eventMap of this._subscriptions.values()) {
            for (let callback of eventMap.values()) {
                if (callback.key == key) {
                    eventMap.delete(key);
                    return;
                }
            }
        }
    }

    public publish(event: string, payload: any): void {
        const eventMap = this._subscriptions.get(event);

        if (eventMap !== undefined) {
            for (let callback of eventMap.values()) {
                callback.func(payload, callback.data);
            }
        }
    }
}
