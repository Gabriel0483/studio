
import { redirect } from 'next/navigation';

/**
 * Automatically redirects users from the /admin root path to the login page.
 */
export default function AdminPage() {
  redirect('/admin/login');
}
