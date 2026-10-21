# Alta segura del administrador

Nadie se vuelve admin por registrarse: el trigger `handle_new_user` crea siempre `role = 'customer'`,
y ningún usuario puede editar `profiles.role` (no hay policy de UPDATE/INSERT sobre `profiles`).

Pasos para Pablo (una sola vez, sin contraseñas en el repo ni en el chat):

1. Supabase → proyecto `optica-virtual` → Authentication → Users → **Add user → Send invitation**
   con el email de Pablo (o "Create new user" y elegir la contraseña directamente ahí).
2. Pablo acepta la invitación y define su propia contraseña. Activar MFA si el plan lo permite.
3. SQL Editor, con el email ya verificado:

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'EMAIL_DE_PABLO');
   ```
4. Entrar en `/admin/login`. Si el usuario no es admin, `requireAdmin()` lo devuelve al login.

Otros admins: repetir los pasos 1-3. Para quitar acceso: `update public.profiles set role = 'customer' ...`.
