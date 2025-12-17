// Simple localStorage-based prototype for users, roles, admin approval, products and activity log
const ROLES = {1: 'admin', 2: 'manager', 3: 'staff'};

function uid(prefix = ''){return prefix + Math.random().toString(36).slice(2,9)}

function load(key){return JSON.parse(localStorage.getItem(key) || 'null')}
function save(key,val){localStorage.setItem(key, JSON.stringify(val))}

function seedAdmin(){
  let users = load('users') || [];
  if(!users.find(u=>u.email==='admin@example.com')){
    users.push({id:uid('u_'),name:'Admin',email:'admin@example.com',pass:'admin123',role_id:1,approved:true,createdAt:Date.now()});
    save('users', users);
    logActivity('system','สร้างผู้ใช้งานเริ่มต้น: admin@example.com');
  }
}

function logActivity(user,action){
  // Simple client-side prototype with optional Firebase integration
  const ROLES = {1: 'admin', 2: 'manager', 3: 'staff'};

  function uid(prefix = ''){return prefix + Math.random().toString(36).slice(2,9)}
  function load(key){return JSON.parse(localStorage.getItem(key) || 'null')}
  function save(key,val){localStorage.setItem(key, JSON.stringify(val))}

  // Firebase runtime vars
  let firebaseEnabled = false;
  let fbAuth = null;
  let fbDB = null;

  function firebaseInit(){
    try{
      if(window.firebaseConfig && window.firebase){
        firebase.initializeApp(window.firebaseConfig);
        fbAuth = firebase.auth();
        fbDB = firebase.firestore();
        firebaseEnabled = true;
        console.info('Firebase enabled');
      }
    }catch(e){console.warn('Firebase init error',e);}
  }

  function seedAdmin(){
    // Keep a local fallback admin for quick testing (localStorage)
    let users = load('users') || [];
    if(!users.find(u=>u.email==='admin@example.com')){
      users.push({id:uid('u_'),name:'Admin',email:'admin@example.com',pass:'admin123',role_id:1,approved:true,createdAt:Date.now()});
      save('users', users);
      logActivity('system','สร้างผู้ใช้งานเริ่มต้น: admin@example.com');
    }
  }

  async function logActivity(user,action){
    const item = {id:uid('a_'),user,action,time:Date.now()};
    if(firebaseEnabled && fbDB){
      try{ await fbDB.collection('activity').add(item); }catch(e){console.warn('fb log failed',e);}  
    }
    const list = load('activity') || [];
    list.unshift(item); save('activity', list);
    renderActivity();
  }

  // UI helpers
  function el(id){return document.getElementById(id)}
  function showModal(mode){el('authModal').style.display='flex';el('authTitle').textContent = mode==='login'?'ล็อกอิน':'สมัคร';
    el('loginForm').style.display = mode==='login'?'block':'none';
    el('registerForm').style.display = mode==='register'?'block':'none';
  }
  function closeModal(){el('authModal').style.display='none'}

  // Auth flows (supports Firebase if configured)
  async function registerUser(){
    const name = el('reg-name').value.trim();
    const email = el('reg-email').value.trim();
    const pass = el('reg-pass').value.trim();
    const role = Number(el('reg-role').value);
    if(!name||!email||!pass){alert('กรุณากรอกข้อมูลให้ครบ');return}

    if(firebaseEnabled && fbAuth && fbDB){
      try{
        const cred = await fbAuth.createUserWithEmailAndPassword(email, pass);
        await cred.user.sendEmailVerification();
        await fbDB.collection('users').doc(cred.user.uid).set({uid:cred.user.uid,name,email,role_id:role,approved:false,createdAt:Date.now()});
        await logActivity(email,'สมัคร (Firebase) - ส่งอีเมลยืนยัน และรออนุมัติ');
        alert('สมัครเรียบร้อย โปรดตรวจสอบอีเมลเพื่อตรวจสอบบัญชี และรอการอนุมัติจาก Admin');
        closeModal();
        return;
      }catch(e){console.error(e); alert('สมัครไม่สำเร็จ: '+(e.message||e)); return}
    }

    // fallback localStorage
    const users = load('users') || [];
    if(users.find(u=>u.email===email)){alert('อีเมลนี้ถูกใช้แล้ว');return}
    const user = {id:uid('u_'),name,email,pass,role_id:role,approved:false,createdAt:Date.now()};
    users.push(user); save('users',users);
    await logActivity(email,'สมัครสมาชิก (รอตรวจสอบ)');
    alert('สมัครเรียบร้อย รอการอนุมัติจาก Admin');
    closeModal();
  }

  async function loginUser(){
    const email = el('login-email').value.trim();
    const pass = el('login-pass').value.trim();

    if(firebaseEnabled && fbAuth && fbDB){
      try{
        const cred = await fbAuth.signInWithEmailAndPassword(email, pass);
        if(!cred.user.emailVerified){alert('กรุณายืนยันอีเมลก่อนเข้าระบบ'); return}
        const doc = await fbDB.collection('users').doc(cred.user.uid).get();
        const profile = doc.exists? doc.data() : null;
        if(!profile || !profile.approved){alert('บัญชียังไม่ได้รับการอนุมัติ'); return}
        const session = {id:cred.user.uid,email:cred.user.email,name:profile.name || cred.user.email,role_id:profile.role_id};
        save('session', session); await logActivity(email,'ล็อกอิน (Firebase)'); closeModal(); refreshUI(); return;
      }catch(e){console.error(e); alert('เข้าสู่ระบบไม่สำเร็จ: '+(e.message||e)); return}
    }

    // local fallback
    const users = load('users') || [];
    const u = users.find(x=>x.email===email && x.pass===pass);
    if(!u){alert('ข้อมูลไม่ถูกต้อง');return}
    if(!u.approved){alert('บัญชียังไม่ได้รับการอนุมัติ');return}
    save('session', {id:u.id,email:u.email,name:u.name,role_id:u.role_id});
    await logActivity(u.email,'ล็อกอิน');
    closeModal(); refreshUI();
  }

  async function logout(){
    const s = load('session'); if(s) await logActivity(s.email,'ออกจากระบบ');
    if(firebaseEnabled && fbAuth){ try{ await fbAuth.signOut(); }catch(e){} }
    localStorage.removeItem('session'); refreshUI();
  }

  // Admin UI: render pending and all users (uses Firestore when available)
  async function renderPending(){
    const listEl = el('pending-users'); listEl.innerHTML='';
    if(firebaseEnabled && fbDB){
      try{
        const snap = await fbDB.collection('users').where('approved','==',false).get();
        if(snap.empty){listEl.innerHTML='<li class="meta">ไม่มีผู้ใช้งานรออนุมัติ</li>';return}
        snap.forEach(doc=>{
          const u = doc.data();
          const li = document.createElement('li');
          li.innerHTML = `<div><strong>${u.name}</strong> <div class="meta">${u.email} — ${ROLES[u.role_id]||u.role_id}</div></div>
            <div>
              <button class="btn small" data-id="${doc.id}" data-action="approve">อนุมัติ</button>
              <button class="btn ghost small" data-id="${doc.id}" data-action="reject">ปฏิเสธ</button>
            </div>`;
          listEl.appendChild(li);
          li.querySelector('[data-action="approve"]').onclick = ()=>toggleApprove(doc.id, true);
          li.querySelector('[data-action="reject"]').onclick = ()=>toggleApprove(doc.id, false);
        })
        return;
      }catch(e){console.warn('renderPending fb',e)}
    }

    // fallback local
    const users = (load('users')||[]).filter(u=>!u.approved);
    if(users.length===0){listEl.innerHTML='<li class="meta">ไม่มีผู้ใช้งานรออนุมัติ</li>';return}
    users.forEach(u=>{
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>${u.name}</strong> <div class="meta">${u.email} — ${ROLES[u.role_id]||u.role_id}</div></div>
        <div>
          <button class="btn small" data-id="${u.id}" data-action="approve">อนุมัติ</button>
        </div>`;
      listEl.appendChild(li);
      li.querySelector('button').onclick = ()=>{approveUser(u.id)};
    })
  }

  async function toggleApprove(id, yes){
    if(firebaseEnabled && fbDB){
      try{ await fbDB.collection('users').doc(id).update({approved: yes}); await logActivity('admin', (yes? 'อนุมัติ':'ปฏิเสธ')+` ${id}`); renderPending(); renderAllUsers(); alert('อัพเดตเรียบร้อย'); return; }catch(e){console.error(e);}
    }
    if(yes) approveUser(id); else {
      // local reject -> remove
      const users = load('users')||[]; const idx = users.findIndex(u=>u.id===id); if(idx>-1){users.splice(idx,1); save('users',users); logActivity('admin','ปฏิเสธผู้ใช้ '+id); renderPending(); renderAllUsers(); alert('ปฏิเสธเรียบร้อย')} 
  }
  }

  function approveUser(id){
    const users = load('users') || [];
    const u = users.find(x=>x.id===id); if(!u) return;
    u.approved = true; save('users', users); logActivity('admin',`อนุมัติผู้ใช้ ${u.email}`); renderPending(); renderAllUsers(); alert('อนุมัติเรียบร้อย');
  }

  async function renderAllUsers(){
    const listEl = el('all-users'); listEl.innerHTML='';
    if(firebaseEnabled && fbDB){
      try{
        const snap = await fbDB.collection('users').get();
        if(snap.empty){listEl.innerHTML='<li class="meta">ยังไม่มีผู้ใช้งาน</li>';return}
        snap.forEach(doc=>{
          const u = doc.data();
          const li = document.createElement('li');
          li.innerHTML = `<div><strong>${u.name}</strong><div class="meta">${u.email} — ${ROLES[u.role_id]||u.role_id} ${u.approved? '• approved':''}</div></div>
            <div>
              <select data-id="${doc.id}" class="role-select">
                <option value="1">admin</option>
                <option value="2">manager</option>
                <option value="3">staff</option>
              </select>
              <button class="btn small" data-id="${doc.id}" data-action="toggleApprove">Toggle</button>
            </div>`;
          listEl.appendChild(li);
          const sel = li.querySelector('.role-select'); sel.value = u.role_id;
          sel.onchange = ()=>changeUserRole(doc.id, Number(sel.value));
          li.querySelector('[data-action="toggleApprove"]').onclick = ()=>toggleApprove(doc.id, !u.approved);
        })
        return;
      }catch(e){console.warn('renderAllUsers fb',e)}
    }

    const users = load('users') || [];
    if(users.length===0){listEl.innerHTML='<li class="meta">ยังไม่มีผู้ใช้งาน</li>';return}
    users.forEach(u=>{
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>${u.name}</strong><div class="meta">${u.email} — ${ROLES[u.role_id]||u.role_id} ${u.approved? '• approved':''}</div></div>
        <div>
          <select data-id="${u.id}" class="role-select">
            <option value="1">admin</option>
            <option value="2">manager</option>
            <option value="3">staff</option>
          </select>
          <button class="btn small" data-id="${u.id}" data-action="toggleApprove">Toggle</button>
        </div>`;
      listEl.appendChild(li);
      const sel = li.querySelector('.role-select'); sel.value = u.role_id;
      sel.onchange = ()=>changeUserRole(u.id, Number(sel.value));
      li.querySelector('[data-action="toggleApprove"]').onclick = ()=>{ u.approved = !u.approved; save('users',users); logActivity('admin',`เปลี่ยนสถานะอนุมัติ ${u.email} -> ${u.approved}`); renderAllUsers(); renderPending(); };
    })
  }

  async function changeUserRole(id, newRole){
    if(firebaseEnabled && fbDB){
      try{ await fbDB.collection('users').doc(id).update({role_id:newRole}); await logActivity('admin',`เปลี่ยน role ${id} -> ${newRole}`); renderAllUsers(); alert('อัปเดต role เรียบร้อย'); return;}catch(e){console.error(e)}
    }
    const users = load('users')||[]; const u = users.find(x=>x.id===id); if(!u) return; u.role_id=newRole; save('users',users); logActivity('admin',`เปลี่ยน role ${u.email} -> ${newRole}`); renderAllUsers();
  }

  // Products (local-only for now; could be migrated to Firestore later)
  function renderProducts(){
    const list = el('product-list'); list.innerHTML='';
    // Firestore-backed products when available
    if(firebaseEnabled && fbDB){
      (async ()=>{
        try{
          const snap = await fbDB.collection('products').orderBy('updatedAt','desc').get();
          if(snap.empty){list.innerHTML='<li class="meta">ยังไม่มีสินค้า</li>';return}
          snap.forEach(doc=>{
            const p = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `<div><strong>${p.name}</strong><div class="meta">Qty: ${p.qty}</div></div>
              <div>
                 <button class="btn small" data-edit="${doc.id}">แก้ไข</button>
                 <button class="btn ghost small" data-del="${doc.id}">ลบ</button>
              </div>`;
            list.appendChild(li);
            li.querySelector('[data-edit]')?.addEventListener('click', ()=>{editProduct(doc.id)});
            li.querySelector('[data-del]')?.addEventListener('click', ()=>{deleteProduct(doc.id)});
          })
          return;
        }catch(e){console.warn('renderProducts fb', e)}
      })();
      return;
    }

    // Local fallback
    const products = load('products') || [];
    if(products.length===0){list.innerHTML='<li class="meta">ยังไม่มีสินค้า</li>';return}
    products.forEach(p=>{
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>${p.name}</strong><div class="meta">Qty: ${p.qty}</div></div>
        <div>
           <button class="btn small" data-edit="${p.id}">แก้ไข</button>
           <button class="btn ghost small" data-del="${p.id}">ลบ</button>
        </div>`;
      list.appendChild(li);
      li.querySelector('[data-edit]')?.addEventListener('click', ()=>{editProduct(p.id)});
      li.querySelector('[data-del]')?.addEventListener('click', ()=>{deleteProduct(p.id)});
    })
  }

  function addProduct(){
    const name = el('product-name').value.trim();
    const qty = Number(el('product-qty').value) || 0;
    if(!name){alert('กรุณากรอกชื่อสินค้า');return}
    const session = load('session'); if(!session){alert('กรุณาล็อกอิน');return}
    if(![1,2].includes(session.role_id)){alert('สิทธิ์ไม่เพียงพอ');return}
    if(firebaseEnabled && fbDB){
      (async ()=>{
        try{
          await fbDB.collection('products').add({name,qty,updatedBy:session.email,updatedAt:Date.now()});
          await logActivity(session.email,`เพิ่มสินค้า ${name}`);
          renderProducts();
        }catch(e){console.error('addProduct fb',e); alert('เพิ่มสินค้าไม่สำเร็จ');}
      })();
      return;
    }

    const prods = load('products') || [];
    const p = {id:uid('p_'),name,qty,updatedBy:session.email,updatedAt:Date.now()};
    prods.push(p); save('products', prods); logActivity(session.email,`เพิ่มสินค้า ${name}`); renderProducts();
  }

  function editProduct(id){
    if(firebaseEnabled && fbDB){
      (async ()=>{
        try{
          // fetch current doc to show defaults
          const doc = await fbDB.collection('products').doc(id).get();
          if(!doc.exists){alert('ไม่พบสินค้า'); return}
          const p = doc.data();
          const newName = prompt('ชื่อใหม่', p.name); if(newName===null) return;
          const newQty = prompt('จำนวน', p.qty); if(newQty===null) return;
          const s = load('session');
          await fbDB.collection('products').doc(id).update({name:newName,qty:Number(newQty),updatedBy: s? s.email : 'unknown',updatedAt:Date.now()});
          await logActivity(s? s.email : 'unknown', `แก้ไขสินค้า ${newName}`);
          renderProducts();
        }catch(e){console.error('editProduct fb',e); alert('แก้ไขไม่สำเร็จ')}
      })();
      return;
    }

    const prods = load('products')||[]; const p = prods.find(x=>x.id===id); if(!p) return;
    const newName = prompt('ชื่อใหม่', p.name); if(newName===null) return;
    const newQty = prompt('จำนวน', p.qty); if(newQty===null) return;
    p.name = newName; p.qty = Number(newQty);
    const s = load('session'); if(s){p.updatedBy=s.email; p.updatedAt=Date.now(); logActivity(s.email,`แก้ไขสินค้า ${p.name}`)}
    save('products',prods); renderProducts();
  }

  function deleteProduct(id){
    if(!confirm('ลบสินค้านี้?')) return;
    if(firebaseEnabled && fbDB){
      (async ()=>{
        try{
          // try to fetch name for logging
          const doc = await fbDB.collection('products').doc(id).get();
          const p = doc.exists? doc.data() : {name:id};
          await fbDB.collection('products').doc(id).delete();
          const s = load('session'); if(s) await logActivity(s.email,`ลบสินค้า ${p.name}`);
          renderProducts();
        }catch(e){console.error('deleteProduct fb',e); alert('ลบไม่สำเร็จ')}
      })();
      return;
    }

    const prods = load('products')||[]; const idx = prods.findIndex(x=>x.id===id); if(idx===-1) return;
    const removed = prods.splice(idx,1)[0]; save('products',prods);
    const s = load('session'); if(s) logActivity(s.email,`ลบสินค้า ${removed.name}`);
    renderProducts();
  }

  // Activity
  async function renderActivity(){
    const elLog = document.getElementById('activity-log'); elLog.innerHTML='';
    if(firebaseEnabled && fbDB){
      try{
        const snap = await fbDB.collection('activity').orderBy('time','desc').limit(100).get();
        if(snap.empty){elLog.innerHTML='<li class="meta">ยังไม่มีบันทึก</li>';return}
        snap.forEach(doc=>{const a = doc.data(); const li = document.createElement('li'); li.innerHTML = `<div>${new Date(a.time).toLocaleString()} — <strong>${a.user}</strong></div><div class="meta">${a.action}</div>`; elLog.appendChild(li);}); return;
      }catch(e){console.warn('renderActivity fb',e)}
    }
    const list = load('activity')||[]; if(list.length===0){elLog.innerHTML='<li class="meta">ยังไม่มีบันทึก</li>';return}
    list.slice(0,100).forEach(a=>{const li = document.createElement('li'); li.innerHTML = `<div>${new Date(a.time).toLocaleString()} — <strong>${a.user}</strong></div><div class="meta">${a.action}</div>`; elLog.appendChild(li);})
  }

  function refreshUI(){
    const s = load('session');
    el('btn-login').style.display = s? 'none' : 'inline-block';
    el('btn-register').style.display = s? 'none' : 'inline-block';
    el('btn-logout').style.display = s? 'inline-block' : 'none';
    el('welcomeText').textContent = s? `สวัสดี, ${s.name}` : 'ยินดีต้อนรับ';
    // show admin menu
    el('adminMenu').style.display = (s && s.role_id===1)?'inline-block':'none';
    renderProducts(); renderActivity(); renderPending(); renderAllUsers();
  }

  function attachEvents(){
    document.querySelectorAll('.menu-btn').forEach(b=>b.addEventListener('click', ()=>{
      document.querySelectorAll('.view').forEach(v=>v.style.display='none');
      document.getElementById(b.dataset.show).style.display='block';
    }));
    el('btn-login').onclick = ()=>showModal('login');
    el('btn-register').onclick = ()=>showModal('register');
    el('authClose').onclick = closeModal;
    el('do-register').onclick = registerUser;
    el('do-login').onclick = loginUser;
    el('btn-logout').onclick = logout;
    el('add-product').onclick = addProduct;
    // admin view toggles
    el('showPending').onclick = ()=>{ el('adminPendingView').style.display='block'; el('adminAllView').style.display='none'; }
    el('showAllUsers').onclick = ()=>{ el('adminPendingView').style.display='none'; el('adminAllView').style.display='block'; }
  }

  // Initialize
  firebaseInit(); seedAdmin(); attachEvents(); refreshUI();