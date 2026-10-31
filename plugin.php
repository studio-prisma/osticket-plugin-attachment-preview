<?php

/**
 * Attachment Preview for osTicket, studio-prisma edition.
 * Fork of https://github.com/clonemeagain/attachment_preview by clonemeagain.
 *
 * @license GPL-2.0-only (same terms as the upstream plugin)
 */

return [
  'id'          => 'studio-prisma:attachment-preview', # notrans
  'version'     => '2.0.0',
  'name'        => 'Attachment Preview',
  'author'      => 'studio-prisma (based on the plugin by clonemeagain)',
  'description' => 'Shows attachments (PDF, images, text, mail, audio, video) and optional YouTube/Vimeo players inline in the ticket thread.',
  'url'         => 'https://github.com/studio-prisma/osticket-plugin-attachment-preview',
  'plugin'      => 'class.AttachmentPreviewPlugin.php:AttachmentPreviewPlugin',
];
