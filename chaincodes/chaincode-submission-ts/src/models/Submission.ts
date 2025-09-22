import { Object, Property } from 'fabric-contract-api';

@Object()
class AttachedDocument {
    @Property()
    public docId!: string;
    @Property()
    public docHash!: string;
    @Property()
    public uploadedTimestamp!: Date;
}


@Object()
export class Submission {
    @Property()
    public submissionID!: string;
    @Property()
    public programID!: string;
    @Property()
    public universityID!: string;
    @Property()
    public status!: string;
    @Property()
    public creationDate!: Date;
    @Property()
    public lastUpdate!: Date;
    @Property()
    public documents!: AttachedDocument[];
}

