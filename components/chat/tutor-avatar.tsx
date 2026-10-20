import Image from 'next/image'

export function TutorAvatar({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/avatars/tutor.png"
      alt="Tutor"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full border border-border object-cover"
    />
  )
}
