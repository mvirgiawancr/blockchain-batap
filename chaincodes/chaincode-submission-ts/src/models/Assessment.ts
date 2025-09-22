import { Object, Property } from 'fabric-contract-api';

@Object()
export class Assessment {


    @Property()
    public assessmentID!: string;

    @Property()
    public submissionID!: string;

    @Property()
    public assessorID!: string;

    @Property()
    public criteriaID!: string;

    @Property()
    public score!: number;

    @Property()
    public comments!: string;
}

