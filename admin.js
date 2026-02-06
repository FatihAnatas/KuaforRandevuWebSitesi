
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, deleteDoc, addDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


const firebaseConfig = window.firebaseConfig; 
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


const loginArea = document.getElementById('login-area');
const adminPanel = document.getElementById('admin-panel');
const loginBtn = document.getElementById('loginBtn');
const adminDatePicker = document.getElementById('adminDatePicker');
const tableBody = document.getElementById('tableBody');
const emptyMsg = document.getElementById('emptyMsg');
const totalCount = document.getElementById('totalCount');
const manualTimeSelect = document.getElementById('manualTime');
const manualNameInput = document.getElementById('manualName');
const manualPhoneInput = document.getElementById('manualPhone');

const audioSuccess = new Audio('success.mp3'); 
const audioCancel = new Audio('cancel.mp3'); 

let isFirstLoad = true; 




if(loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            
        } catch (error) {
            alert("Hatalı Giriş: Şifre veya E-posta geçersiz.");
            console.error(error);
        }
    });
}


onAuthStateChanged(auth, (user) => {
    if (user) {
        
        loginArea.style.display = 'none';
        adminPanel.style.display = 'block';
        
        
        setupAdminPage();
    } else {
        
        loginArea.style.display = 'block';
        adminPanel.style.display = 'none';
    }
});


window.logout = async function() {
    if(confirm("Çıkış yapmak istediğinize emin misiniz?")) {
        await signOut(auth);
        window.location.href = "index.html";
    }
};


function listenLiveUpdates() {
    const qListen = query(collection(db, "randevular"));

    onSnapshot(qListen, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (!isFirstLoad) {
                const data = change.doc.data();
                
                
                if (change.type === "added") {
                    audioSuccess.play().catch(e => console.log("Ses izni hatası:", e));
                    if (data.tarih === adminDatePicker.value) loadAppointments(data.tarih);
                }
                
                
                if (change.type === "removed") {
                    audioCancel.play().catch(e => console.log("Ses izni hatası:", e));
                    if (data.tarih === adminDatePicker.value) loadAppointments(data.tarih);
                }
            }
        });
        isFirstLoad = false;
    });
}



async function loadAppointments(date) {
    if(!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Yükleniyor...</td></tr>`;
    
    const q = query(collection(db, "randevular"), where("tarih", "==", date));
    
    try {
        const querySnapshot = await getDocs(q);
        let randevular = [];
        querySnapshot.forEach((doc) => randevular.push({ id: doc.id, ...doc.data() }));

        randevular.sort((a, b) => a.saat.localeCompare(b.saat));

        tableBody.innerHTML = "";
        totalCount.innerText = randevular.length;

        if (randevular.length === 0) {
            emptyMsg.style.display = "block";
        } else {
            emptyMsg.style.display = "none";
            randevular.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="color:#d4af37; font-weight:bold;">${r.saat}</td>
                    <td style="color:#fff;">${r.isim}</td>
                    <td><a href="tel:${r.telefon}" style="color:#bbb; text-decoration:none;">${r.telefon}</a></td>
                    <td><button class="delete-btn-small" onclick="adminDelete('${r.id}')">SİL ❌</button></td>
                `;
                tableBody.appendChild(tr);
            });
        }
    } catch (error) { console.error("Veri yükleme hatası:", error); }
}

window.adminDelete = async function(id) {
    if(!confirm("Bu randevuyu silmek istediğinize emin misiniz?")) return;
    try {
        await deleteDoc(doc(db, "randevular", id));
    } catch (e) { alert("Hata: " + e.message); }
};

window.addManualAppointment = async function() {
    const saat = manualTimeSelect.value;
    const isim = manualNameInput.value.trim();
    const tel = manualPhoneInput.value;
    const tarih = adminDatePicker.value; 

    if (!saat || !isim) { alert("Lütfen saat ve isim giriniz!"); return; }

    try {
        const q = query(collection(db, "randevular"), where("tarih", "==", tarih), where("saat", "==", saat));
        const cakisma = await getDocs(q);

        if (!cakisma.empty) { alert("Bu saat zaten dolu!"); return; }

        await addDoc(collection(db, "randevular"), { 
            isim: isim, 
            telefon: tel, 
            tarih: tarih, 
            saat: saat, 
            created: new Date() 
        });
        
        manualNameInput.value = ""; manualPhoneInput.value = "";
    } catch (e) { alert("Hata: " + e.message); }
};


function setupAdminPage() {
    if(adminDatePicker && !adminDatePicker.value) {
        const bugun = new Date();
        const yil = bugun.getFullYear();
        const ay = String(bugun.getMonth() + 1).padStart(2, '0');
        const gun = String(bugun.getDate()).padStart(2, '0');
        adminDatePicker.value = `${yil}-${ay}-${gun}`;

        fillTimeSelect();
        loadAppointments(adminDatePicker.value);
        listenLiveUpdates();

        adminDatePicker.addEventListener('change', (e) => loadAppointments(e.target.value));
    }
}

function fillTimeSelect() {
    if(!manualTimeSelect || manualTimeSelect.options.length > 1) return;
    let baslangic = 9 * 60; 
    while (baslangic <= 20 * 60) {
        const saat = Math.floor(baslangic / 60);
        const dk = baslangic % 60;
        const saatMetni = `${saat.toString().padStart(2, '0')}:${dk.toString().padStart(2, '0')}`;
        const option = document.createElement('option');
        option.value = saatMetni; option.innerText = saatMetni;
        manualTimeSelect.appendChild(option);
        baslangic += 30;
    }
}