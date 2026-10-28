// lib/elementor/widgets.ts
import {
  Type, AlignLeft, Image, Video, Music, LayoutTemplate, Space, Minus,
  Square, Play, MapPin, Calendar, Link as LinkIcon, Grid, List,
  AlignCenter, User, Users, Star, Heart, Gift, Clock, Phone, Mail, Map, Globe,
  ShoppingCart, CreditCard, Tag, Percent, MessageCircle, Share2,
  ThumbsUp, CheckCircle, XCircle, Info, AlertCircle, Download,
  Upload, Search, Filter, Settings, Lock, Unlock, Eye, EyeOff,
  Box, Layers, Columns, Maximize, ArrowRight, ArrowLeft,
  ChevronRight, ChevronDown, Menu, Home, FileText, Folder,
  Edit, Copy, ZoomIn, Cloud, Anchor, Compass, Award, Bookmark,
  Briefcase, Camera, Coffee, Database, Feather, Film, Flag,
  Headphones, Key, LifeBuoy, Navigation, PieChart, Printer,
  Radio, Server, Smartphone, Speaker, Tablet, Tv, Watch,
  Wifi, Zap, Code2, Paintbrush, Shield, Sliders, Layout, MousePointer,
  BoxSelect, Grid3X3, ImagePlus, MessageSquare, PhoneCall, ShoppingBag,
  Table, Workflow, CalendarDays, Clock3, CreditCard as CardIcon
} from "lucide-react";

export type WidgetCategory = 
  | "Basic Elements" 
  | "Layout & Containers" 
  | "Navigation" 
  | "Forms & Input" 
  | "E-commerce" 
  | "Blog & Content" 
  | "Marketing" 
  | "Interactive" 
  | "Media" 
  | "Advanced" 
  | "Invitation Specific";

export interface WidgetDefinition {
  type: string;
  name: string;
  icon: any;
  category: WidgetCategory;
  defaultContent: Record<string, any>;
  defaultStyles: Record<string, any>;
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // ==========================================
  // 1. BASIC ELEMENTS (1-25)
  // ==========================================
  { type: "heading", name: "Heading", icon: Type, category: "Basic Elements", defaultContent: { text: "Add Your Heading Text Here" }, defaultStyles: { fontSize: "32px", color: "#1f2937", fontWeight: "bold" } },
  { type: "image", name: "Image", icon: Image, category: "Basic Elements", defaultContent: { src: "", alt: "Image" }, defaultStyles: { width: "100%", borderRadius: "8px" } },
  { type: "text_editor", name: "Text Editor", icon: AlignLeft, category: "Basic Elements", defaultContent: { text: "<p>Rich text editor content</p>" }, defaultStyles: {} },
  { type: "video", name: "Video", icon: Video, category: "Basic Elements", defaultContent: { src: "" }, defaultStyles: {} },
  { type: "button", name: "Button", icon: Square, category: "Basic Elements", defaultContent: { text: "Click Me" }, defaultStyles: { backgroundColor: "#f97316", color: "#fff", padding: "12px 24px", borderRadius: "8px" } },
  { type: "divider", name: "Divider", icon: Minus, category: "Basic Elements", defaultContent: {}, defaultStyles: { borderColor: "#e5e7eb", borderWidth: "1px" } },
  { type: "spacer", name: "Spacer", icon: Space, category: "Basic Elements", defaultContent: {}, defaultStyles: { height: "50px" } },
  { type: "google_maps", name: "Google Maps", icon: MapPin, category: "Basic Elements", defaultContent: { lat: 0, lng: 0 }, defaultStyles: {} },
  { type: "icon", name: "Icon", icon: Star, category: "Basic Elements", defaultContent: { icon: "Star" }, defaultStyles: { color: "#f97316", size: "24px" } },
  { type: "image_box", name: "Image Box", icon: ImagePlus, category: "Basic Elements", defaultContent: { title: "Image Box", desc: "Description" }, defaultStyles: {} },
  { type: "icon_box", name: "Icon Box", icon: Box, category: "Basic Elements", defaultContent: { title: "Icon Box", desc: "Description" }, defaultStyles: {} },
  { type: "star_rating", name: "Star Rating", icon: Star, category: "Basic Elements", defaultContent: { rating: 4.5 }, defaultStyles: {} },
  { type: "image_gallery", name: "Image Gallery", icon: Grid, category: "Basic Elements", defaultContent: { images: [] }, defaultStyles: {} },
  { type: "image_carousel", name: "Image Carousel", icon: Image, category: "Basic Elements", defaultContent: {}, defaultStyles: {} },
  { type: "icon_list", name: "Icon List", icon: List, category: "Basic Elements", defaultContent: { items: ["Item 1", "Item 2"] }, defaultStyles: {} },
  { type: "counter", name: "Counter", icon: Clock, category: "Basic Elements", defaultContent: { start: 0, end: 100, suffix: "+" }, defaultStyles: {} },
  { type: "progress_bar", name: "Progress Bar", icon: PieChart, category: "Basic Elements", defaultContent: { label: "Skill", value: 80 }, defaultStyles: {} },
  { type: "testimonial", name: "Testimonial", icon: MessageCircle, category: "Basic Elements", defaultContent: { quote: "Amazing!", author: "John Doe" }, defaultStyles: {} },
  { type: "testimonials_carousel", name: "Testimonials Carousel", icon: MessageSquare, category: "Basic Elements", defaultContent: {}, defaultStyles: {} },
  { type: "tabs", name: "Tabs", icon: LayoutTemplate, category: "Basic Elements", defaultContent: { tabs: ["Tab 1", "Tab 2"] }, defaultStyles: {} },
  { type: "accordion", name: "Accordion", icon: List, category: "Basic Elements", defaultContent: { items: ["Item 1"] }, defaultStyles: {} },
  { type: "toggle", name: "Toggle", icon: ChevronDown, category: "Basic Elements", defaultContent: {}, defaultStyles: {} },
  { type: "social_icons", name: "Social Icons", icon: Share2, category: "Basic Elements", defaultContent: {}, defaultStyles: {} },
  { type: "alert", name: "Alert", icon: AlertCircle, category: "Basic Elements", defaultContent: { text: "Alert message" }, defaultStyles: { backgroundColor: "#fef2f2", color: "#dc2626" } },
  { type: "html", name: "HTML", icon: Code2, category: "Basic Elements", defaultContent: { code: "<div>Hello</div>" }, defaultStyles: {} },

  // ==========================================
  // 2. LAYOUT & CONTAINERS (26-45)
  // ==========================================
  { type: "container", name: "Container", icon: Box, category: "Layout & Containers", defaultContent: {}, defaultStyles: {} },
  { type: "inner_section", name: "Inner Section", icon: Box, category: "Layout & Containers", defaultContent: {}, defaultStyles: {} },
  { type: "section", name: "Section", icon: Layers, category: "Layout & Containers", defaultContent: {}, defaultStyles: { padding: "40px" } },
  { type: "column", name: "Column", icon: Columns, category: "Layout & Containers", defaultContent: {}, defaultStyles: {} },
  { type: "grid_container", name: "Grid Container", icon: Grid3X3, category: "Layout & Containers", defaultContent: {}, defaultStyles: {} },
  { type: "flexbox", name: "Flexbox Container", icon: Layout, category: "Layout & Containers", defaultContent: {}, defaultStyles: {} },
  { type: "nested_elements", name: "Nested Elements", icon: Workflow, category: "Layout & Containers", defaultContent: {}, defaultStyles: {} },
  { type: "menu_anchor", name: "Menu Anchor", icon: Anchor, category: "Layout & Containers", defaultContent: { id: "section-1" }, defaultStyles: {} },
  { type: "sidebar", name: "Sidebar", icon: LayoutTemplate, category: "Layout & Containers", defaultContent: {}, defaultStyles: {} },
  { type: "table_of_contents", name: "Table of Contents", icon: List, category: "Layout & Containers", defaultContent: {}, defaultStyles: {} },
  { type: "loop_grid", name: "Loop Grid", icon: Grid, category: "Layout & Containers", defaultContent: {}, defaultStyles: {} },
  { type: "loop_carousel", name: "Loop Carousel", icon: Image, category: "Layout & Containers", defaultContent: {}, defaultStyles: {} },
  { type: "posts", name: "Posts", icon: FileText, category: "Layout & Containers", defaultContent: {}, defaultStyles: {} },
  { type: "archive_posts", name: "Archive Posts", icon: Folder, category: "Layout & Containers", defaultContent: {}, defaultStyles: {} },
  { type: "portfolio", name: "Portfolio", icon: Briefcase, category: "Layout & Containers", defaultContent: {}, defaultStyles: {} },
  { type: "slides", name: "Slides", icon: Image, category: "Layout & Containers", defaultContent: {}, defaultStyles: {} },
  { type: "call_to_action", name: "Call to Action", icon: MousePointer, category: "Layout & Containers", defaultContent: {}, defaultStyles: {} },
  { type: "flip_box", name: "Flip Box", icon: BoxSelect, category: "Layout & Containers", defaultContent: {}, defaultStyles: {} },
  { type: "animated_headline", name: "Animated Headline", icon: Type, category: "Layout & Containers", defaultContent: {}, defaultStyles: {} },
  { type: "read_more", name: "Read More", icon: ArrowRight, category: "Layout & Containers", defaultContent: {}, defaultStyles: {} },

  // ==========================================
  // 3. NAVIGATION (46-65)
  // ==========================================
  { type: "wordpress_menu", name: "WordPress Menu", icon: Menu, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "nav_menu", name: "Nav Menu", icon: Navigation, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "mega_menu", name: "Mega Menu", icon: Menu, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "site_logo", name: "Site Logo", icon: Image, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "site_title", name: "Site Title", icon: Type, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "page_title", name: "Page Title", icon: Type, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "search_form", name: "Search Form", icon: Search, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "search_results", name: "Search Results", icon: Search, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "breadcrumbs", name: "Breadcrumbs", icon: ChevronRight, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "login", name: "Login", icon: Lock, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "user_menu", name: "User Menu", icon: User, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "menu_cart", name: "Menu Cart", icon: ShoppingCart, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "off_canvas_menu", name: "Off-Canvas Menu", icon: Menu, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "popup", name: "Popup", icon: Maximize, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "header_template", name: "Header Template", icon: LayoutTemplate, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "footer_template", name: "Footer Template", icon: LayoutTemplate, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "sticky_header", name: "Sticky Header", icon: Anchor, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "dropdown_menu", name: "Dropdown Menu", icon: ChevronDown, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "vertical_menu", name: "Vertical Menu", icon: Menu, category: "Navigation", defaultContent: {}, defaultStyles: {} },
  { type: "language_switcher", name: "Language Switcher", icon: Globe, category: "Navigation", defaultContent: {}, defaultStyles: {} },

  // ==========================================
  // 4. FORMS & INPUT (66-85)
  // ==========================================
  { type: "form", name: "Form", icon: FileText, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },
  { type: "text_field", name: "Text Field", icon: Edit, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },
  { type: "email_field", name: "Email Field", icon: Mail, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },
  { type: "password_field", name: "Password Field", icon: Lock, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },
  { type: "number_field", name: "Number Field", icon: Type, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },
  { type: "telephone_field", name: "Telephone Field", icon: Phone, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },
  { type: "url_field", name: "URL Field", icon: LinkIcon, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },
  { type: "textarea", name: "Textarea", icon: AlignLeft, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },
  { type: "select_field", name: "Select Field", icon: ChevronDown, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },
  { type: "checkbox_field", name: "Checkbox Field", icon: CheckCircle, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },
  { type: "radio_field", name: "Radio Button Field", icon: CheckCircle, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },
  { type: "acceptance_field", name: "Acceptance Field", icon: CheckCircle, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },
  { type: "date_field", name: "Date Field", icon: CalendarDays, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },
  { type: "time_field", name: "Time Field", icon: Clock3, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },
  { type: "file_upload", name: "File Upload Field", icon: Upload, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },
  { type: "hidden_field", name: "Hidden Field", icon: EyeOff, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },
  { type: "html_field", name: "HTML Field", icon: Code2, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },
  { type: "submit_button", name: "Submit Button", icon: Square, category: "Forms & Input", defaultContent: { text: "Submit" }, defaultStyles: {} },
  { type: "multi_step_form", name: "Multi-Step Form", icon: Workflow, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },
  { type: "form_confirmation", name: "Form Confirmation", icon: CheckCircle, category: "Forms & Input", defaultContent: {}, defaultStyles: {} },

  // ==========================================
  // 5. E-COMMERCE (86-110)
  // ==========================================
  { type: "products", name: "Products", icon: ShoppingBag, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "archive_products", name: "Archive Products", icon: Grid, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "product_title", name: "Product Title", icon: Type, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "product_images", name: "Product Images", icon: Image, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "product_price", name: "Product Price", icon: Tag, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "product_rating", name: "Product Rating", icon: Star, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "product_stock", name: "Product Stock", icon: Box, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "product_short_desc", name: "Product Short Description", icon: FileText, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "product_content", name: "Product Content", icon: FileText, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "add_to_cart", name: "Add to Cart", icon: ShoppingCart, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "product_meta", name: "Product Meta", icon: Info, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "product_data_tabs", name: "Product Data Tabs", icon: LayoutTemplate, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "product_related", name: "Product Related", icon: Grid, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "product_upsells", name: "Product Upsells", icon: Grid, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "product_categories", name: "Product Categories", icon: Grid, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "product_gallery", name: "Product Gallery", icon: Image, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "cart", name: "Cart", icon: ShoppingCart, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "checkout", name: "Checkout", icon: CreditCard, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "my_account", name: "My Account", icon: User, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "menu_cart_ecom", name: "Menu Cart", icon: ShoppingCart, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "product_breadcrumbs", name: "Product Breadcrumbs", icon: ChevronRight, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "product_navigation", name: "Product Navigation", icon: Navigation, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "sale_badge", name: "Sale Badge", icon: Percent, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "order_summary", name: "Order Summary", icon: FileText, category: "E-commerce", defaultContent: {}, defaultStyles: {} },
  { type: "purchase_summary", name: "Purchase Summary", icon: FileText, category: "E-commerce", defaultContent: {}, defaultStyles: {} },

  // ==========================================
  // 6. BLOG & CONTENT (111-130)
  // ==========================================
  { type: "posts_blog", name: "Posts", icon: FileText, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "post_title", name: "Post Title", icon: Type, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "post_content", name: "Post Content", icon: FileText, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "post_excerpt", name: "Post Excerpt", icon: AlignLeft, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "featured_image", name: "Featured Image", icon: Image, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "post_info", name: "Post Info", icon: Info, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "author_box", name: "Author Box", icon: User, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "author_name", name: "Author Name", icon: User, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "author_image", name: "Author Image", icon: Image, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "author_bio", name: "Author Bio", icon: AlignLeft, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "comments", name: "Comments", icon: MessageCircle, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "post_comments", name: "Post Comments", icon: MessageCircle, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "related_posts", name: "Related Posts", icon: FileText, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "recent_posts", name: "Recent Posts", icon: Clock, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "popular_posts", name: "Popular Posts", icon: Star, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "categories", name: "Categories", icon: Folder, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "tags", name: "Tags", icon: Tag, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "archive_title", name: "Archive Title", icon: Type, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "archive_desc", name: "Archive Description", icon: AlignLeft, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },
  { type: "pagination", name: "Pagination", icon: ChevronRight, category: "Blog & Content", defaultContent: {}, defaultStyles: {} },

  // ==========================================
  // 7. MARKETING (131-150)
  // ==========================================
  { type: "cta_marketing", name: "Call to Action", icon: MousePointer, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "pricing_table", name: "Pricing Table", icon: CreditCard, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "price_list", name: "Price List", icon: List, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "testimonial_carousel", name: "Testimonial Carousel", icon: MessageSquare, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "countdown", name: "Countdown", icon: Clock, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "countdown_timer", name: "Countdown Timer", icon: Clock, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "progress_tracker", name: "Progress Tracker", icon: PieChart, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "coupon_code", name: "Coupon Code", icon: Tag, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "promo_banner", name: "Promo Banner", icon: Image, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "announcement_bar", name: "Announcement Bar", icon: Info, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "lead_capture", name: "Lead Capture Form", icon: User, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "newsletter_signup", name: "Newsletter Signup", icon: Mail, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "email_optin", name: "Email Opt-in", icon: Mail, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "popup_trigger", name: "Popup Trigger", icon: Maximize, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "exit_intent_popup", name: "Exit Intent Popup", icon: XCircle, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "trust_badges", name: "Trust Badges", icon: Shield, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "logo_carousel", name: "Logo Carousel", icon: Image, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "client_reviews", name: "Client Reviews", icon: Star, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "comparison_table", name: "Comparison Table", icon: Table, category: "Marketing", defaultContent: {}, defaultStyles: {} },
  { type: "faq", name: "FAQ", icon: MessageCircle, category: "Marketing", defaultContent: {}, defaultStyles: {} },

  // ==========================================
  // 8. INTERACTIVE (151-170)
  // ==========================================
  { type: "lottie_animation", name: "Lottie Animation", icon: Play, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "motion_effects", name: "Motion Effects", icon: Play, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "mouse_effects", name: "Mouse Effects", icon: MousePointer, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "scrolling_effects", name: "Scrolling Effects", icon: Sliders, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "entrance_animation", name: "Entrance Animation", icon: Play, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "image_hotspot", name: "Image Hotspot", icon: MapPin, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "image_accordion", name: "Image Accordion", icon: Image, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "content_switcher", name: "Content Switcher", icon: LayoutTemplate, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "before_after_slider", name: "Before After Slider", icon: Image, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "interactive_cards", name: "Interactive Cards", icon: Box, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "flip_cards", name: "Flip Cards", icon: Copy, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "3d_tilt", name: "3D Tilt", icon: BoxSelect, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "parallax_background", name: "Parallax Background", icon: Image, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "text_path", name: "Text Path", icon: Type, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "animated_text", name: "Animated Text", icon: Type, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "typing_effect", name: "Typing Effect", icon: Type, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "marquee", name: "Marquee", icon: Sliders, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "vertical_timeline", name: "Vertical Timeline", icon: Clock, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "horizontal_timeline", name: "Horizontal Timeline", icon: Clock, category: "Interactive", defaultContent: {}, defaultStyles: {} },
  { type: "interactive_map", name: "Interactive Map", icon: Map, category: "Interactive", defaultContent: {}, defaultStyles: {} },

  // ==========================================
  // 9. MEDIA (171-185)
  // ==========================================
  { type: "audio_player", name: "Audio Player", icon: Music, category: "Media", defaultContent: {}, defaultStyles: {} },
  { type: "playlist", name: "Playlist", icon: Music, category: "Media", defaultContent: {}, defaultStyles: {} },
  { type: "video_playlist", name: "Video Playlist", icon: Video, category: "Media", defaultContent: {}, defaultStyles: {} },
  { type: "video_gallery", name: "Video Gallery", icon: Video, category: "Media", defaultContent: {}, defaultStyles: {} },
  { type: "lightbox_gallery", name: "Lightbox Gallery", icon: Maximize, category: "Media", defaultContent: {}, defaultStyles: {} },
  { type: "masonry_gallery", name: "Masonry Gallery", icon: Grid, category: "Media", defaultContent: {}, defaultStyles: {} },
  { type: "justified_gallery", name: "Justified Gallery", icon: Grid, category: "Media", defaultContent: {}, defaultStyles: {} },
  { type: "instagram_feed", name: "Instagram Feed", icon: Camera, category: "Media", defaultContent: {}, defaultStyles: {} },
  { type: "facebook_embed", name: "Facebook Embed", icon: Globe, category: "Media", defaultContent: {}, defaultStyles: {} },
  { type: "youtube_feed", name: "YouTube Feed", icon: Video, category: "Media", defaultContent: {}, defaultStyles: {} },
  { type: "vimeo_embed", name: "Vimeo Embed", icon: Video, category: "Media", defaultContent: {}, defaultStyles: {} },
  { type: "pdf_viewer", name: "PDF Viewer", icon: FileText, category: "Media", defaultContent: {}, defaultStyles: {} },
  { type: "svg_icon", name: "SVG Icon", icon: Image, category: "Media", defaultContent: {}, defaultStyles: {} },
  { type: "image_mask", name: "Image Mask", icon: Image, category: "Media", defaultContent: {}, defaultStyles: {} },
  { type: "background_slideshow", name: "Background Slideshow", icon: Image, category: "Media", defaultContent: {}, defaultStyles: {} },

  // ==========================================
  // 10. ADVANCED (186-200)
  // ==========================================
  { type: "data_table", name: "Data Table", icon: Table, category: "Advanced", defaultContent: {}, defaultStyles: {} },
  { type: "tablepress", name: "TablePress", icon: Table, category: "Advanced", defaultContent: {}, defaultStyles: {} },
  { type: "advanced_tabs", name: "Advanced Tabs", icon: LayoutTemplate, category: "Advanced", defaultContent: {}, defaultStyles: {} },
  { type: "advanced_accordion", name: "Advanced Accordion", icon: List, category: "Advanced", defaultContent: {}, defaultStyles: {} },
  { type: "advanced_button", name: "Advanced Button", icon: Square, category: "Advanced", defaultContent: {}, defaultStyles: {} },
  { type: "dual_button", name: "Dual Button", icon: Copy, category: "Advanced", defaultContent: {}, defaultStyles: {} },
  { type: "advanced_heading", name: "Advanced Heading", icon: Type, category: "Advanced", defaultContent: {}, defaultStyles: {} },
  { type: "advanced_image_box", name: "Advanced Image Box", icon: ImagePlus, category: "Advanced", defaultContent: {}, defaultStyles: {} },
  { type: "advanced_icon_box", name: "Advanced Icon Box", icon: Box, category: "Advanced", defaultContent: {}, defaultStyles: {} },
  { type: "advanced_carousel", name: "Advanced Carousel", icon: Image, category: "Advanced", defaultContent: {}, defaultStyles: {} },
  { type: "content_ticker", name: "Content Ticker", icon: Sliders, category: "Advanced", defaultContent: {}, defaultStyles: {} },
  { type: "business_hours", name: "Business Hours", icon: Clock, category: "Advanced", defaultContent: {}, defaultStyles: {} },
  { type: "qr_code", name: "QR Code", icon: Grid, category: "Advanced", defaultContent: {}, defaultStyles: {} },
  { type: "dynamic_field", name: "Dynamic Field", icon: Edit, category: "Advanced", defaultContent: {}, defaultStyles: {} },
  { type: "dynamic_gallery", name: "Dynamic Gallery", icon: Grid, category: "Advanced", defaultContent: {}, defaultStyles: {} },

  // ==========================================
  // 11. INVITATION SPECIFIC (Bonus for Riwainvite)
  // ==========================================
  { type: "rsvp_form", name: "RSVP Form", icon: Calendar, category: "Invitation Specific", defaultContent: { btnText: "I'm Attending" }, defaultStyles: { btnColor: "#f97316" } },
  { type: "event_date", name: "Event Date", icon: Calendar, category: "Invitation Specific", defaultContent: { date: "December 31, 2026" }, defaultStyles: {} },
  { type: "event_time", name: "Event Time", icon: Clock, category: "Invitation Specific", defaultContent: { time: "7:00 PM" }, defaultStyles: {} },
  { type: "event_venue", name: "Event Venue", icon: MapPin, category: "Invitation Specific", defaultContent: { venue: "The Grand Ballroom" }, defaultStyles: {} },
  { type: "countdown_wedding", name: "Wedding Countdown", icon: Clock, category: "Invitation Specific", defaultContent: {}, defaultStyles: {} },
  { type: "our_story", name: "Our Story", icon: Heart, category: "Invitation Specific", defaultContent: { text: "How we met..." }, defaultStyles: {} },
  { type: "gift_registry", name: "Gift Registry", icon: Gift, category: "Invitation Specific", defaultContent: {}, defaultStyles: {} },
  { type: "wedding_hashtag", name: "Wedding Hashtag", icon: Tag, category: "Invitation Specific", defaultContent: { hashtag: "#Riwainvite2026" }, defaultStyles: {} },
  { type: "menu", name: "Menu", icon: FileText, category: "Invitation Specific", defaultContent: {}, defaultStyles: {} },
  { type: "dress_code", name: "Dress Code", icon: User, category: "Invitation Specific", defaultContent: { text: "Black Tie" }, defaultStyles: {} },
];