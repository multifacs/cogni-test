import { LabColor } from '../logic/lab-color.svelte';

type CampimetryCommon = {
	attempt: number;
	stage: number;
	silhouette: string;
	channel: 'a' | 'b';
	op: '+' | '-';
};

export interface CampimetryTask extends CampimetryCommon {
	color: LabColor;
}

export interface CampimetryResult extends CampimetryCommon {
    type: 'campimetry';
	color: string;
	delta: number;
	time: number;
}
