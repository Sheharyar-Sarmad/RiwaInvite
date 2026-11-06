import type { Metadata } from "next";
import { PreviewClient } from "@/components/public/sections/templates/PreviewClient";
import { sql } from "@/db/connections/postgres_connection";
import settings from "@/config/settings_config";

const config = settings();

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}): Promise<Metadata> {
  const resolvedParams = await params;
  
  try {
    const [template] = await sql`
      SELECT 
        t.name, 
        t.description, 
        t.thumbnail_url AS "thumbnailUrl", 
        c.name AS "categoryName"
      FROM templates t
      JOIN template_categories c ON t.category_id = c.id
      WHERE t.id = ${resolvedParams.id} AND t.status = 'published'
    `;

    if (!template) {
      return {
        title: "Preview Not Found | Riwainvite",
        description: "The template you are looking for does not exist or has been removed.",
        robots: { index: false, follow: false },
      };
    }

    const title = `Live Preview: ${template.name} - ${template.categoryName} Invitation | Riwainvite`;
    
    const description = template.description 
      ? `Experience the full interactive live preview of the ${template.name} template. ${template.description.slice(0, 130)}...`
      : `Explore the immersive, interactive live preview of the ${template.name} digital invitation template. Perfect for your ${template.categoryName.toLowerCase()} event.`;

    // Use the template's actual thumbnail for social sharing, fallback to the default preview OG image
    const ogImage = template.thumbnailUrl || "/og-preview-image.png";

    return {
      metadataBase: new URL(config.appUrl),
      title,
      description,
      keywords: [
        template.name,
        template.categoryName,
        "digital invitation preview",
        "interactive invitation",
        "wedding website demo",
        "event invitation template",
        "Riwainvite preview",
        "live preview",
      ],
      authors: [{ name: "Riwainvite", url: config.appUrl }],
      creator: "Riwainvite",
      publisher: "Riwainvite",
      alternates: {
        canonical: `/preview/${resolvedParams.id}`,
      },
      robots: {
        index: false, // Absolutely do not index the preview page
        follow: true, // Still allow crawlers to follow links inside (like the buy button)
        googleBot: {
          index: false,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
      openGraph: {
        title,
        description,
        url: `${config.appUrl}/preview/${resolvedParams.id}`,
        siteName: "Riwainvite",
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: `Live Preview of ${template.name}`,
            type: "image/png",
          },
        ],
        locale: "en_US",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
        creator: "@riwainvite", // Replace with your actual Twitter/X handle
      },
      applicationName: "Riwainvite",
      appleWebApp: {
        capable: true,
        title: "Live Preview | Riwainvite",
        statusBarStyle: "default",
      },
      formatDetection: {
        telephone: false,
      },
    };
  } catch (error) {
    console.error("Error generating preview metadata:", error);
    return {
      title: "Live Preview | Riwainvite",
      description: "Experience this premium digital invitation template.",
      robots: { index: false, follow: false },
    };
  }
}

export default async function PreviewPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = await params;
  return <PreviewClient id={resolvedParams.id} />;
}