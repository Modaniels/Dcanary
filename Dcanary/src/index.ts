import { IDL, query, update } from 'azle';

export default class {
    message: string = 'Hello Junior!,How you  holdint up?';

    @query([], IDL.Text)
    getMessage(): string {
        return this.message;
    }

    @update([IDL.Text])
    setMessage(message: string): void {
        this.message = message;
    }
}
