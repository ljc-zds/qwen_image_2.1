import { envConfigs } from '@/config';

export function studioDiscovery(full: boolean) {
  const base = envConfigs.app_url;
  const lines = [
    '# ' + envConfigs.app_name,
    '',
    '> Independent creative workspace for Qwen Image 2.1 image generation, editing and transparent PNGs.',
    '',
    '## Pages',
    '- [Home](' +
      base +
      '/): Discover the creative toolkit and original gallery.',
    '- [Image generator](' + base + '/image-generator): Describe a new image.',
    '- [Transparent PNG](' +
      base +
      '/transparent-png): Native alpha-channel image creation.',
    '- [Image editor](' + base + '/image-editor): Reference-based editing.',
    '- [Prompt library](' + base + '/prompts): Reusable creative prompts.',
    '',
    '## Availability',
    'This site is a preview until an inference bridge is configured. Preview artwork is illustrative, not Qwen model output.',
    'Prism Studio is independent and not affiliated with Qwen.',
  ];
  if (full)
    lines.push(
      '',
      '## Model and workflow',
      'Qwen Image 2.1 unifies text-to-image and image editing and supports native RGBA. This first interface accepts one reference image.',
      'For transparent generation, the studio adds instructions requesting an alpha channel and transparent background.',
      'Real generation requires a configured service and an authenticated user. Commercial use requires suitable model and provider authorization.',
      '',
      'Official model information: https://qwen.ai/blog?id=qwen-image-2.1'
    );
  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
