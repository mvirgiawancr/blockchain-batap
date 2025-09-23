import { Context, Contract } from 'fabric-contract-api';
export declare class UserContract extends Contract {
    constructor();
    /**
     * Mendaftarkan pengguna baru ke dalam sistem.
     * (Logika belum diimplementasikan)
     */
    registerUser(ctx: Context, userID: string, username: string, hashedPassword: string, role: string): Promise<void>;
    getUserByUsername(ctx: Context, username: string): Promise<string>;
    /**
     * Mengambil profil pengguna berdasarkan ID.
     * (Logika belum diimplementasikan)
     */
    getUser(ctx: Context, userID: string): Promise<string>;
    /**
     * Fungsi dasar untuk mengecek apakah sebuah aset ada di ledger.
     * Ini adalah fungsi utilitas internal.
     */
    private assetExists;
}
