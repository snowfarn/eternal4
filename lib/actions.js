'use server';

import { writeJSON, readJSON, deleteUploadFile } from './data';
import { revalidatePath } from 'next/cache';

// NOTE: Add authentication checks here later.

export async function updateSiteSettings(settings) {
  const success = await writeJSON('site_settings.json', settings);
  if (success) {
    revalidatePath('/', 'layout');
    revalidatePath('/members', 'layout');
    revalidatePath('/secret-admin/dashboard', 'layout');
  }
  return success;
}

export async function updateRoles(roles) {
  const success = await writeJSON('roles.json', roles);
  if (success) {
    revalidatePath('/', 'layout');
    revalidatePath('/members');
    revalidatePath('/secret-admin/dashboard');
  }
  return success;
}

export async function updateMembers(members) {
  const success = await writeJSON('members.json', members);
  if (success) {
    revalidatePath('/', 'layout');
    revalidatePath('/members');
    revalidatePath('/dashboard');
    revalidatePath('/secret-admin/dashboard');
  }
  return success;
}

export async function updateMemberRole(memberId, roleId) {
  const members = (await readJSON('members.json')) || [];
  const index = members.findIndex(m => m.id === memberId);
  if (index === -1) {
    return { success: false, message: 'Member not found' };
  }

  members[index].roleId = roleId;
  members[index].updatedAt = new Date().toISOString();

  const success = await writeJSON('members.json', members);
  if (success) {
    revalidatePath('/', 'layout');
    revalidatePath('/members');
    revalidatePath('/dashboard');
    revalidatePath('/secret-admin/dashboard');
    revalidatePath(`/bio/${memberId}`);
    if (members[index].slug) {
      revalidatePath(`/bio/${members[index].slug}`);
    }
  }
  return { success, member: members[index], members };
}

export async function applyToGang(application) {
  const apps = (await readJSON('applications.json')) || [];
  const existingIdx = apps.findIndex(a => a.id === application.id);
  if (existingIdx !== -1) {
    apps[existingIdx] = {
      ...apps[existingIdx],
      ...application,
      updatedAt: new Date().toISOString()
    };
  } else {
    apps.push({
      ...application,
      appliedAt: new Date().toISOString()
    });
  }
  const success = await writeJSON('applications.json', apps);
  if (success) {
    revalidatePath('/secret-admin/dashboard');
    revalidatePath('/dashboard');
  }
  return success;
}

export async function checkSlug(memberId, slug) {
  if (!slug) return { available: true };
  const clean = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const members = (await readJSON('members.json')) || [];
  const exists = members.some(m => 
    m.id !== memberId && 
    (
      (m.slug && m.slug.toLowerCase() === clean) ||
      (m.name && m.name.toLowerCase() === clean) ||
      m.id === clean
    )
  );
  return { available: !exists, cleanSlug: clean };
}

export async function banMember(memberId) {
  const members = (await readJSON('members.json')) || [];
  const index = members.findIndex(m => m.id === memberId);
  if (index === -1) return { success: false, message: 'Member not found' };
  members[index].banned = true;
  members[index].bannedAt = new Date().toISOString();
  await writeJSON('members.json', members);
  revalidatePath('/members');
  revalidatePath('/dashboard');
  revalidatePath(`/bio/${memberId}`);
  if (members[index].slug) revalidatePath(`/bio/${members[index].slug}`);
  return { success: true, member: members[index] };
}

export async function unbanMember(memberId) {
  const members = (await readJSON('members.json')) || [];
  const index = members.findIndex(m => m.id === memberId);
  if (index === -1) return { success: false, message: 'Member not found' };
  members[index].banned = false;
  delete members[index].bannedAt;
  await writeJSON('members.json', members);
  revalidatePath('/members');
  revalidatePath('/dashboard');
  revalidatePath(`/bio/${memberId}`);
  if (members[index].slug) revalidatePath(`/bio/${members[index].slug}`);
  return { success: true, member: members[index] };
}

export async function deleteMember(memberId) {
  const members = (await readJSON('members.json')) || [];
  const target = members.find(m => m.id === memberId);
  const filtered = members.filter(m => m.id !== memberId);
  await writeJSON('members.json', filtered);
  revalidatePath('/members');
  revalidatePath('/dashboard');
  if (target) {
    revalidatePath(`/bio/${memberId}`);
    if (target.slug) revalidatePath(`/bio/${target.slug}`);
  }
  return { success: true };
}

export async function updateMemberBio(memberId, bioData) {
  const members = (await readJSON('members.json')) || [];
  const index = members.findIndex(m => m.id === memberId);
  if (index === -1) {
    return { success: false, message: 'Member not found' };
  }

  if (members[index].banned) {
    return { success: false, error: 'banned', message: 'บัญชีของคุณถูกระงับการใช้งาน ไม่สามารถแก้ไขข้อมูลได้' };
  }

  // Handle custom URL slug if provided
  if (bioData.slug !== undefined) {
    let cleanSlug = (bioData.slug || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
    if (cleanSlug) {
      const exists = members.some(m => 
        m.id !== memberId && 
        (
          (m.slug && m.slug.toLowerCase() === cleanSlug) ||
          (m.name && m.name.toLowerCase() === cleanSlug) ||
          m.id === cleanSlug
        )
      );
      if (exists) {
        return { 
          success: false, 
          error: 'slug_taken', 
          message: 'ชื่อที่อยู่นี้มีผู้ใช้งานแล้ว โปรดเลือกชื่ออื่น (This URL address is already taken)' 
        };
      }
      bioData.slug = cleanSlug;
    } else {
      bioData.slug = '';
    }
  }

  // Clean up replaced uploaded files to save disk space
  const oldMember = members[index];
  const oldFilesToCheck = [
    oldMember.avatar,
    oldMember.backgroundUrl,
    oldMember.musicCover,
    oldMember.musicUrl,
    ...(Array.isArray(oldMember.customParticleImages) ? oldMember.customParticleImages : [])
  ];

  const newFiles = [
    bioData.avatar,
    bioData.backgroundUrl,
    bioData.musicCover,
    bioData.musicUrl,
    ...(Array.isArray(bioData.customParticleImages) ? bioData.customParticleImages : [])
  ];

  for (const oldFile of oldFilesToCheck) {
    if (oldFile && typeof oldFile === 'string' && (oldFile.startsWith('/uploads/') || oldFile.includes('/storage/v1/object/public/uploads/')) && !newFiles.includes(oldFile)) {
      deleteUploadFile(oldFile).catch(() => {});
    }
  }

  // Preserve existing member fields (like roleId, views) if not explicitly overwritten
  members[index] = { 
    ...members[index], 
    ...bioData,
    updatedAt: new Date().toISOString()
  };

  await writeJSON('members.json', members);
  revalidatePath('/members');
  revalidatePath('/dashboard');
  revalidatePath(`/bio/${memberId}`);
  if (members[index].slug) {
    revalidatePath(`/bio/${members[index].slug}`);
  }
  return { success: true, member: members[index] };
}

export async function recordBioView(memberId) {
  const members = (await readJSON('members.json')) || [];
  const index = members.findIndex(m => m.id === memberId);
  if (index !== -1) {
    members[index].views = (members[index].views || 0) + 1;
    await writeJSON('members.json', members);
    return members[index].views;
  }
  return 0;
}

export async function updateApplications(applications) {
  const success = await writeJSON('applications.json', applications);
  if (success) {
    revalidatePath('/secret-admin/dashboard');
    revalidatePath('/dashboard');
  }
  return success;
}
