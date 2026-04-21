<script lang="ts">
	interface ToggleSwitchProps {
		id: string;
		label: string;
		value: boolean;
	}

	let { id, label, value = $bindable() }: ToggleSwitchProps = $props();
</script>

<label
	for={id}
	class="flex cursor-pointer items-center justify-center whitespace-nowrap select-none"
>
	<div class="switch">
		<input class="switch-input" type="checkbox" {id} name={id} bind:checked={value} />
		<span class="slider round"></span>
	</div>
	{label}
</label>

<style>
	.switch {
		--animation-duration: 100ms;
		--switch-diameter: 1.625em;
		--switch-offset: 0.25em;
		--track-width: 3.75em;
		--track-height: 2.125em;

		font-size: 0.5em;
		position: relative;
		display: inline-block;
		width: var(--track-width);
		height: var(--track-height);
		margin-right: 0.75em;

		.switch-input {
			opacity: 0;
			width: 0;
			height: 0;

			&:checked + .slider {
				background-color: #2196f3;
			}

			&:focus + .slider {
				box-shadow: 0 0 1px #2196f3;
			}

			&:checked + .slider:before {
				-webkit-transform: translateX(var(--switch-diameter));
				-ms-transform: translateX(var(--switch-diameter));
				transform: translateX(var(--switch-diameter));
			}
		}

		.slider {
			position: absolute;
			cursor: pointer;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background-color: #ccc;
			-webkit-transition: var(--animation-duration);
			transition: var(--animation-duration);

			&:before {
				position: absolute;
				content: "";
				height: var(--switch-diameter);
				width: var(--switch-diameter);
				left: var(--switch-offset);
				bottom: var(--switch-offset);
				background-color: white;
				-webkit-transition: var(--animation-duration);
				transition: var(--animation-duration);
			}
			/* Rounded sliders */
			&.round {
				border-radius: var(--track-height);
			}

			&.round:before {
				border-radius: 50%;
			}
		}
	}
</style>
