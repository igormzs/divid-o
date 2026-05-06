import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Divid-o',
    short_name: 'Divid-o',
    description: 'Settle up effortlessly. The fully free expense sharing platform.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0C65B4',
    icons: [
      {
        src: '/favicon.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
