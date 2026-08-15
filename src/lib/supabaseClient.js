import { createClient } from '@supabase/supabase-js';
import { SEED_SERVICES, SEED_PROJECTS, SEED_TEAM, SEED_TESTIMONIALS } from '../data/seedData';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.trim() !== '' && 
  supabaseAnonKey.trim() !== '' &&
  !supabaseUrl.includes('placeholder')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Robust Data Access Service with graceful fallback
 */
export const dataService = {
  // Services
  async getServices(categorySlug = null) {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('services').select('*').order('sort_order', { ascending: true });
        if (categorySlug) {
          // Map category slug to proper name if needed
          const categoryName = categorySlug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          query = query.ilike('category', `%${categoryName}%`);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getServices fetch failed, using fallback:', err);
      }
    }
    
    // Fallback to offline SEED_SERVICES
    if (categorySlug) {
      return SEED_SERVICES.filter(s => s.categorySlug === categorySlug);
    }
    return SEED_SERVICES;
  },

  // Projects
  async getProjects(sector = null) {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('projects').select('*').order('created_at', { ascending: false });
        if (sector && sector !== 'All') {
          query = query.eq('sector', sector);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getProjects fetch failed, using fallback:', err);
      }
    }

    if (sector && sector !== 'All') {
      return SEED_PROJECTS.filter(p => p.sector.toLowerCase() === sector.toLowerCase());
    }
    return SEED_PROJECTS;
  },

  // Single Project by Slug
  async getProjectBySlug(slug) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('slug', slug)
          .single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase getProjectBySlug failed, using fallback:', err);
      }
    }
    return SEED_PROJECTS.find(p => p.slug === slug) || null;
  },

  // Team Members
  async getTeamMembers() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('*')
          .order('sort_order', { ascending: true });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getTeamMembers failed, using fallback:', err);
      }
    }
    return SEED_TEAM;
  },

  // Testimonials
  async getTestimonials() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('testimonials')
          .select('*');
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getTestimonials failed, using fallback:', err);
      }
    }
    return SEED_TESTIMONIALS;
  },

  // Enquiries (Contact submission)
  async submitEnquiry(enquiry) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('enquiries')
        .insert([{
          name: enquiry.name,
          company: enquiry.company || '',
          email: enquiry.email,
          phone: enquiry.phone || '',
          project_type: enquiry.projectType || enquiry.project_type || 'General Enquiry',
          message: enquiry.message,
          status: 'new'
        }]);
      if (error) throw error;
      return { success: true, mode: 'supabase', data };
    }

    // Local Mock / Demo submission
    console.info('Enquiry received (Local Mode):', enquiry);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    return { success: true, mode: 'local' };
  }
};
