import type { Metadata } from "next";
import { SingleTemplateClient } from "@/components/public/sections/templates/SingleTemplateClient";
import { sql } from "@/db/connections/postgres_connection";
import settings from "@/config/settings_config";

const config = settings();

// 1. Enhanced Dynamic Metadata
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}): Promise<Metadata> {
  const resolvedParams = await params;
  
  try {
    // Fetch only the necessary fields for SEO
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
        title: "Template Not Found | Riwainvite",
        description: "The template you are looking for does not exist or has been removed.",
      };
    }

    const title = `${template.name} - ${template.categoryName} Invitation | Riwainvite`;
    const description = template.description 
      ? template.description.slice(0, 160) // SEO best practice: keep descriptions under 160 chars
      : `Create a stunning digital invitation with the ${template.name} template. Fully customizable and ready for your event.`;
    
    // Use the template's actual thumbnail for social sharing, fallback to the new single template OG image
    const ogImage = template.thumbnailUrl || "/og-single-template-image.png";

    return {
      metadataBase: new URL(config.appUrl),
      title,
      description,
      alternates: {
        canonical: `/template/${resolvedParams.id}`,
      },
      openGraph: {
        title,
        description,
        url: `${config.appUrl}/template/${resolvedParams.id}`,
        siteName: "Riwainvite",
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: template.name,
          },
        ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
        creator: "@riwainvite",
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    // Fallback metadata if the DB query fails
    return {
      title: "Premium Invitation Template | Riwainvite",
      description: "Preview this premium digital invitation template and make it yours today.",
    };
  }
}

// 2. The Page Component
export default async function SingleTemplatePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = await params;
  
  return (
    <main className="min-h-screen w-full bg-[#fdeadb]">
      <SingleTemplateClient id={resolvedParams.id} />
    </main>
  );
}