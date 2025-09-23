import { Context, Contract, Info, Transaction } from 'fabric-contract-api';
import { User } from "../models/User"

@Info({ title: 'UserContract', description: 'Smart Contract untuk mengelola pengguna' })
export class UserContract extends Contract {

    public constructor() {
        super('UserContract'); // Nama unik untuk kontrak ini
    }

    /**
     * Mendaftarkan pengguna baru ke dalam sistem.
     * (Logika belum diimplementasikan)
     */
    @Transaction()
    public async registerUser(ctx: Context, userID: string, username: string, hashedPassword: string, role: string): Promise<void> {
        const validRoles = ['UniversityAdmin', 'Assessor', 'SuperAdmin'];
        if (!validRoles.includes(role)) {
            throw new Error(`Peran "${role}" tidak valid. Peran yang diizinkan adalah: ${validRoles.join(', ')}`);
        }


        const exists = await this.assetExists(ctx, userID);
        if (exists) {
            throw new Error(`Pengguna dengan ID ${userID} sudah ada.`);
        }


        const user = new User();
        user.userID = userID;
        user.username = username;
        user.hashedPassword = hashedPassword;
        user.role = role;

        await ctx.stub.putState(userID, Buffer.from(JSON.stringify(user)));
    }

    @Transaction(false)
    public async getUserByUsername(ctx: Context, username: string): Promise<string> {
        const allResults = [];
        // Buat iterator untuk semua data
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
                // Cek apakah record memiliki properti 'username'
                if (record && record.username === username) {
                    return JSON.stringify(record);
                }
            } catch (err) {
                console.log(err);
            }
            result = await iterator.next();
        }
        // Jika tidak ditemukan setelah iterasi selesai
        throw new Error(`Pengguna dengan username ${username} tidak ditemukan.`);
    }

    /**
     * Mengambil profil pengguna berdasarkan ID.
     * (Logika belum diimplementasikan)
     */
    @Transaction(false)
    public async getUser(ctx: Context, userID: string): Promise<string> {
        const userJSON = await ctx.stub.getState(userID);
        if (!userJSON || userJSON.length === 0) {
            throw new Error(`Pengguna dengan ID ${userID} tidak ditemukan.`);
        }
        return userJSON.toString();
    }

    /**
     * Fungsi dasar untuk mengecek apakah sebuah aset ada di ledger.
     * Ini adalah fungsi utilitas internal.
     */
    private async assetExists(ctx: Context, id: string): Promise<boolean> {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }
}

