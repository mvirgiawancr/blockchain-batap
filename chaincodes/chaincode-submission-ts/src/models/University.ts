import { Object, Property } from 'fabric-contract-api';

@Object()
export class University {

    @Property()
    public universityID!: string;

    @Property()
    public name!: string;

    @Property()
    public address!: string;
}