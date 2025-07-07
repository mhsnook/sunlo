// import Image from 'next/image'
import { cn } from '@/lib/utils'

export const Garlic = ({ size = 50, className = '' }) => (
	<img
		src="/images/garlic.png"
		alt="a smiling garlic"
		width={size}
		height={size}
		style={{
			filter: 'drop-shadow(0px 0px 2px #fff)',
		}}
		className={cn('place-self-center', className)}
	/>
)

export const GarlicBroccoli = ({ size = 240, className = '' }) => (
	<img
		src="/images/logo-pair.png"
		alt="a smiling garlic and broccoli"
		width={size}
		height={size / 1.5}
		className={cn('place-self-center', className)}
	/>
)
