/**
 * Schema.org structured data generator
 * Creates JSON-LD schema markup for SEO
 */

import type { SchemaMarkup, BlogPost } from '../types';

/**
 * Organization schema data
 */
export interface OrganizationData {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[]; // Social media profiles
  contactPoint?: {
    type: string;
    telephone?: string;
    email?: string;
  };
}

/**
 * WebSite schema data
 */
export interface WebSiteData {
  name: string;
  url: string;
  description?: string;
  searchUrl?: string; // For sitelinks search box
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Product schema data
 */
export interface ProductData {
  name: string;
  description: string;
  image?: string;
  price?: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  brand?: string;
  sku?: string;
  rating?: {
    value: number;
    count: number;
  };
}

/**
 * FAQ schema data
 */
export interface FAQData {
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

/**
 * Schema data object type
 */
type SchemaData = Record<string, unknown>;

/**
 * Generates Schema.org structured data markup
 */
export class SchemaGenerator {
  private domain: string;

  constructor(domain: string) {
    this.domain = domain.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Generate Organization schema
   * Used for company/brand information in search results
   */
  generateOrganizationSchema(data: OrganizationData): SchemaMarkup {
    const schema: SchemaData = {
      name: data.name,
      url: data.url,
    };

    if (data.logo) {
      schema['logo'] = {
        '@type': 'ImageObject',
        url: data.logo,
      };
    }

    if (data.description) {
      schema['description'] = data.description;
    }

    if (data.sameAs && data.sameAs.length > 0) {
      schema['sameAs'] = data.sameAs;
    }

    if (data.contactPoint) {
      schema['contactPoint'] = {
        '@type': data.contactPoint.type,
        ...(data.contactPoint.telephone && { telephone: data.contactPoint.telephone }),
        ...(data.contactPoint.email && { email: data.contactPoint.email }),
      };
    }

    return {
      type: 'Organization',
      data: schema,
    };
  }

  /**
   * Generate WebSite schema
   * Enables sitelinks search box and site name in search results
   */
  generateWebSiteSchema(data: WebSiteData): SchemaMarkup {
    const schema: SchemaData = {
      name: data.name,
      url: data.url,
    };

    if (data.description) {
      schema['description'] = data.description;
    }

    // Add search action for sitelinks search box
    if (data.searchUrl) {
      schema['potentialAction'] = {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: data.searchUrl,
        },
        'query-input': 'required name=search_term_string',
      };
    }

    return {
      type: 'WebSite',
      data: schema,
    };
  }

  /**
   * Generate BlogPosting schema for a blog post
   * Enables rich article snippets in search results
   */
  generateBlogPostingSchema(post: BlogPost): SchemaMarkup {
    const schema: SchemaData = {
      headline: post.title,
      description: post.metaDescription,
      datePublished: post.publishedAt.toISOString(),
      dateModified: post.publishedAt.toISOString(),
      author: {
        '@type': 'Person',
        name: post.author,
      },
      publisher: {
        '@type': 'Organization',
        name: post.author, // Could be overridden with actual org
        url: this.domain,
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${this.domain}/blog/${post.slug}`,
      },
    };

    if (post.featuredImage) {
      schema['image'] = {
        '@type': 'ImageObject',
        url: `${this.domain}${post.featuredImage.filename}`,
        width: post.featuredImage.dimensions.width,
        height: post.featuredImage.dimensions.height,
      };
    }

    if (post.targetKeyword) {
      schema['keywords'] = [post.targetKeyword, ...post.secondaryKeywords].join(', ');
    }

    // Add word count for article length signals
    const wordCount = post.content.split(/\s+/).length;
    schema['wordCount'] = wordCount;

    return {
      type: 'BlogPosting',
      data: schema,
    };
  }

  /**
   * Generate Article schema (more generic than BlogPosting)
   */
  generateArticleSchema(
    title: string,
    description: string,
    author: string,
    publishedAt: Date,
    modifiedAt?: Date,
    image?: string
  ): SchemaMarkup {
    const schema: SchemaData = {
      headline: title,
      description: description,
      datePublished: publishedAt.toISOString(),
      dateModified: (modifiedAt ?? publishedAt).toISOString(),
      author: {
        '@type': 'Person',
        name: author,
      },
    };

    if (image) {
      schema['image'] = image;
    }

    return {
      type: 'Article',
      data: schema,
    };
  }

  /**
   * Generate BreadcrumbList schema
   * Shows breadcrumb navigation in search results
   */
  generateBreadcrumbSchema(path: string): SchemaMarkup {
    const segments = path.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [
      { name: 'Home', url: this.domain },
    ];

    let currentPath = '';
    for (const segment of segments) {
      currentPath += `/${segment}`;
      items.push({
        name: this.formatBreadcrumbName(segment),
        url: `${this.domain}${currentPath}`,
      });
    }

    return this.generateBreadcrumbSchemaFromItems(items);
  }

  /**
   * Generate BreadcrumbList schema from custom items
   */
  generateBreadcrumbSchemaFromItems(items: BreadcrumbItem[]): SchemaMarkup {
    const itemListElement = items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    }));

    return {
      type: 'BreadcrumbList',
      data: {
        itemListElement,
      },
    };
  }

  /**
   * Generate Product schema
   * Enables rich product snippets with price, availability, etc.
   */
  generateProductSchema(product: ProductData): SchemaMarkup {
    const schema: SchemaData = {
      name: product.name,
      description: product.description,
    };

    if (product.image) {
      schema['image'] = product.image;
    }

    if (product.brand) {
      schema['brand'] = {
        '@type': 'Brand',
        name: product.brand,
      };
    }

    if (product.sku) {
      schema['sku'] = product.sku;
    }

    // Offers
    if (product.price !== undefined) {
      schema['offers'] = {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: product.currency ?? 'USD',
        availability: `https://schema.org/${product.availability ?? 'InStock'}`,
      };
    }

    // Aggregate rating
    if (product.rating) {
      schema['aggregateRating'] = {
        '@type': 'AggregateRating',
        ratingValue: product.rating.value,
        reviewCount: product.rating.count,
      };
    }

    return {
      type: 'Product',
      data: schema,
    };
  }

  /**
   * Generate FAQPage schema
   * Enables FAQ rich snippets
   */
  generateFAQSchema(faqs: FAQData): SchemaMarkup {
    const mainEntity = faqs.questions.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    }));

    return {
      type: 'FAQPage',
      data: {
        mainEntity,
      },
    };
  }

  /**
   * Generate LocalBusiness schema
   * For local SEO with address, hours, etc.
   */
  generateLocalBusinessSchema(
    name: string,
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    },
    phone?: string,
    openingHours?: string[]
  ): SchemaMarkup {
    const schema: SchemaData = {
      name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: address.street,
        addressLocality: address.city,
        addressRegion: address.state,
        postalCode: address.zip,
        addressCountry: address.country,
      },
    };

    if (phone) {
      schema['telephone'] = phone;
    }

    if (openingHours && openingHours.length > 0) {
      schema['openingHours'] = openingHours;
    }

    return {
      type: 'LocalBusiness',
      data: schema,
    };
  }

  /**
   * Generate HowTo schema
   * For step-by-step guides
   */
  generateHowToSchema(
    name: string,
    description: string,
    steps: Array<{ name: string; text: string; image?: string }>
  ): SchemaMarkup {
    const stepsData = steps.map((step, index) => {
      const stepSchema: SchemaData = {
        '@type': 'HowToStep',
        position: index + 1,
        name: step.name,
        text: step.text,
      };

      if (step.image) {
        stepSchema['image'] = step.image;
      }

      return stepSchema;
    });

    return {
      type: 'HowTo',
      data: {
        name,
        description,
        step: stepsData,
      },
    };
  }

  /**
   * Convert SchemaMarkup to JSON-LD string
   */
  toJsonLd(schema: SchemaMarkup): string {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': schema.type,
      ...schema.data,
    };

    return JSON.stringify(jsonLd, null, 2);
  }

  /**
   * Convert SchemaMarkup to HTML script tag
   */
  toScriptTag(schema: SchemaMarkup): string {
    const jsonLd = this.toJsonLd(schema);
    return `<script type="application/ld+json">\n${jsonLd}\n</script>`;
  }

  /**
   * Combine multiple schemas into a single graph
   */
  combineSchemas(schemas: SchemaMarkup[]): string {
    const graph = schemas.map((schema) => ({
      '@type': schema.type,
      ...schema.data,
    }));

    const combined = {
      '@context': 'https://schema.org',
      '@graph': graph,
    };

    return JSON.stringify(combined, null, 2);
  }

  /**
   * Format a URL segment as a breadcrumb name
   */
  private formatBreadcrumbName(segment: string): string {
    return segment
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

/**
 * Convenience functions for quick schema generation
 */
export function generateOrganizationSchema(domain: string, name: string): SchemaMarkup {
  const generator = new SchemaGenerator(domain);
  return generator.generateOrganizationSchema({
    name,
    url: domain,
  });
}

export function generateWebSiteSchema(domain: string, name: string): SchemaMarkup {
  const generator = new SchemaGenerator(domain);
  return generator.generateWebSiteSchema({
    name,
    url: domain,
  });
}

export function generateBlogPostingSchema(post: BlogPost, domain: string): SchemaMarkup {
  const generator = new SchemaGenerator(domain);
  return generator.generateBlogPostingSchema(post);
}

export function generateBreadcrumbSchema(path: string, domain: string): SchemaMarkup {
  const generator = new SchemaGenerator(domain);
  return generator.generateBreadcrumbSchema(path);
}
