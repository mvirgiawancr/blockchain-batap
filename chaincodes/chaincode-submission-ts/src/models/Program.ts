import { Object, Property } from 'fabric-contract-api';

@Object()
export class Program {

    @Property()
    public programID!: string;

    @Property()
    public programName!: string;

    @Property()
    public degree!: string;

    @Property()
    public accreditationStatus!: string;

    @Property()
    public lastAccreditationDate!: number;

    @Property()
    public universityID!: string;
}

