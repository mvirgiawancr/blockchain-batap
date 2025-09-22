import { Object, Property } from 'fabric-contract-api';
@Object()
export class User {

    @Property()
    public userID!: string;

    @Property()
    public username!: string;


    @Property()
    public hashedPassword!: string;

    @Property()
    public role!: string;

    @Property()
    public specialization?: string;
}

