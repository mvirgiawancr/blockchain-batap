import { Object, Property } from 'fabric-contract-api';

@Object()
export class Document {


    @Property()
    public documentID!: string;

    @Property()
    public fileName!: string;

    @Property()
    public documentHash!: string;

    @Property()
    public ipfsCID!: string;

    @Property()
    public uploadTimestamp!: number;

    @Property()
    public submissionID!: string;
}

