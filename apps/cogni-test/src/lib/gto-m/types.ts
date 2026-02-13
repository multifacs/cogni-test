export type GtoProfile = 'main'; // should be a union of string and can be extended later

export type GtoSession = {
    userId: string;
	adminId: string;
    profile: GtoProfile;
	tests: string[]; // TODO: change type to be compatible with TestType from unmerged pr
};
