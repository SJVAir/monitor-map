export abstract class MapIntegration {
	abstract referenceId: string;
	abstract enabled: boolean;

	abstract apply(): void;

	remove?(): void;
}
