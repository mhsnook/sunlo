import { demoExpect, demoExpectTruthy } from './demo-test-helpers.spec'

/**
 * Demo component to test the vite-plugin-strip-test-code
 *
 * In development:
 * - The import above will work
 * - The demoExpect calls will run
 * - Console will show test logs
 *
 * In production:
 * - The import will be removed
 * - The demoExpect calls will be removed
 * - No test code in final bundle
 */
export function DemoComponent() {
	const handleClick = () => {
		const a = 5
		const b = 10
		const result = a + b

		// These calls should be stripped in production
		demoExpect(result, 15, 'addition test')
		demoExpectTruthy(result, 'result exists')

		console.log('Demo calculation result:', result)
		alert(`Result: ${result}`)
	}

	return (
		<div style={{ padding: '2rem', border: '1px solid #ccc', margin: '1rem' }}>
			<h2>Demo Component - Test Plugin</h2>
			<p>
				Click the button below. In dev mode, you'll see test logs. In production,
				test code will be stripped.
			</p>
			<button
				onClick={handleClick}
				style={{
					padding: '0.5rem 1rem',
					background: '#007bff',
					color: 'white',
					border: 'none',
					borderRadius: '4px',
					cursor: 'pointer',
				}}
			>
				Run Test
			</button>
		</div>
	)
}
