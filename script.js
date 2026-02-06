
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = window.firebaseConfig; 
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


const datePicker = document.getElementById('datePicker');
const slotsArea = document.getElementById('slotsArea');
const formArea = document.getElementById('formArea');
const selectedTimeDisplay = document.getElementById('selectedTimeDisplay');
const bookBtn = document.getElementById('bookBtn');
const phoneInput = document.getElementById('phoneInput');
const nameInput = document.getElementById('nameInput');
const searchPhoneInput = document.getElementById('searchPhoneInput');
const searchBtn = document.getElementById('searchBtn');
const resultArea = document.getElementById('resultArea');
let selectedSlot = null; 

if(datePicker) {
    const bugun = new Date();
    const yil = bugun.getFullYear();
    const ay = String(bugun.getMonth() + 1).padStart(2, '0');
    const gun = String(bugun.getDate()).padStart(2, '0');
    datePicker.value = `${yil}-${ay}-${gun}`;
    datePicker.min = `${yil}-${ay}-${gun}`;
    datePicker.addEventListener('change', loadSlots);
    loadSlots();
}

window.switchTab = function(tabName) {
    const viewBook = document.getElementById('view-book');
    const viewCancel = document.getElementById('view-cancel');
    const welcomeText = document.getElementById('welcome-text'); 
    const btnBook = document.getElementById('tab-book');
    const btnCancel = document.getElementById('tab-cancel');

    if(welcomeText) welcomeText.style.display = 'none';

    if (tabName === 'book') {
        viewBook.style.display = 'block';
        viewCancel.style.display = 'none';
        btnBook.classList.add('active');
        btnCancel.classList.remove('active');
        loadSlots(); 
    } else {
        viewBook.style.display = 'none';
        viewCancel.style.display = 'block';
        btnBook.classList.remove('active');
        btnCancel.classList.add('active');
    }
};

function setupPhoneInput(inputElement) {
    if (!inputElement) return;
    if(inputElement.value === "") inputElement.value = "0";
    inputElement.addEventListener('input', function (e) {
        let rawValue = e.target.value.replace(/\D/g, '');
        if (rawValue.charAt(0) !== '0') rawValue = '0' + rawValue;
        let parts = rawValue.match(/^0(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);
        e.target.value = `0${parts[1] ? ' ' + parts[1] : ''}${parts[2] ? ' ' + parts[2] : ''}${parts[3] ? ' ' + parts[3] : ''}${parts[4] ? ' ' + parts[4] : ''}`;
    });
}
setupPhoneInput(phoneInput);
setupPhoneInput(searchPhoneInput);

async function loadSlots() {
    if(!slotsArea) return;
    slotsArea.innerHTML = "<p style='grid-column: span 4; text-align:center; color:#888;'>Saatler Yükleniyor...</p>";
    formArea.style.display = "none";
    selectedSlot = null;

    const q = query(collection(db, "randevular"), where("tarih", "==", datePicker.value));
    const querySnapshot = await getDocs(q);
    const doluSaatler = [];
    querySnapshot.forEach((doc) => doluSaatler.push(doc.data().saat));

    let baslangic = 9 * 60; 
    let htmlContent = "";
    while (baslangic <= 20 * 60) {
        const saat = Math.floor(baslangic / 60);
        const dakika = baslangic % 60;
        const saatMetni = `${saat.toString().padStart(2, '0')}:${dakika.toString().padStart(2, '0')}`;
        let classList = 'slot';
        let onclickAttr = `onclick="selectSlot(this, '${saatMetni}')"`;
        if (doluSaatler.includes(saatMetni)) { classList += ' disabled'; onclickAttr = ""; }
        htmlContent += `<div class="${classList}" ${onclickAttr}>${saatMetni}</div>`;
        baslangic += 30;
    }
    slotsArea.innerHTML = htmlContent;
}

window.selectSlot = function(element, time) {
    if (element.classList.contains('disabled')) return;
    document.querySelectorAll('.slot').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    selectedSlot = time;
    if(selectedTimeDisplay) selectedTimeDisplay.innerText = time;
    formArea.style.display = 'block';
    if(nameInput) nameInput.focus();
};

if(bookBtn) {
    bookBtn.addEventListener('click', async () => {
        const ad = nameInput.value.trim();
        const tel = phoneInput.value;
        if (!ad || tel.replace(/\s/g, '').length < 11 || !selectedSlot) { alert("Lütfen bilgileri eksiksiz giriniz."); return; }
        
        bookBtn.innerText = "İşleniyor...";
        bookBtn.disabled = true;

        try {
            await addDoc(collection(db, "randevular"), {
                isim: ad, telefon: tel, tarih: datePicker.value, saat: selectedSlot, created: new Date()
            });

            document.getElementById('modalMessage').innerHTML = `Sayın <b>${ad}</b>,<br>Randevunuz: <b>${datePicker.value} | ${selectedSlot}</b>`;
            document.getElementById('successModal').style.display = 'flex';
            
            nameInput.value = ""; phoneInput.value = "0"; formArea.style.display = "none"; selectedSlot = null;
            bookBtn.innerText = "Randevuyu Onayla"; bookBtn.disabled = false;
            await loadSlots(); 

        } catch (e) { alert("Hata: " + e.message); bookBtn.disabled = false; }
    });
}

window.closeModal = () => document.getElementById('successModal').style.display = 'none';

if(searchBtn) {
    searchBtn.addEventListener('click', async () => {
        const tel = searchPhoneInput.value;
        if (tel.replace(/\s/g, '').length < 11) { alert("Numarayı tam giriniz."); return; }
        
        resultArea.innerHTML = ""; 
        const q = query(collection(db, "randevular"), where("telefon", "==", tel));
        const querySnapshot = await getDocs(q);
        searchPhoneInput.value = "0"; 

        if (querySnapshot.empty) { resultArea.innerHTML = "<p style='color:#ccc; text-align:center;'>Randevu bulunamadı.</p>"; return; }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const tarihObj = new Date(data.tarih);
            const formatliTarih = tarihObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'long' });

            const div = document.createElement('div');
            div.className = 'appointment-card';
           div.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; background: #222; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #444; width: 100%; max-width: 500px; margin-left: auto; margin-right: auto;">
        <div style="text-align: left;">
            <div style="font-weight:bold; color:#d4af37; font-size:16px;">${formatliTarih} | ${data.saat}</div>
            <div style="font-size:14px; color:#aaa; margin-top:5px;">${data.isim}</div>
        </div>
        <button 
            onclick="deleteAppointment('${docSnap.id}')" 
            onmouseover="this.style.backgroundColor='transparent'; this.style.color='#d4af37';" 
            onmouseout="this.style.backgroundColor='#d4af37'; this.style.color='#000';"
            style="background-color: #d4af37; color: #000; border: 2px solid #d4af37; padding: 10px 20px; font-weight: bold; border-radius: 5px; cursor: pointer; font-size: 14px; transition: 0.3s;">
            İPTAL ET
        </button>
    </div>`;
resultArea.appendChild(div);
        });
    });
}

window.deleteAppointment = async function(docId) {
    if(!confirm("İptal etmek istediğinize emin misiniz?")) return;
    try {
        await deleteDoc(doc(db, "randevular", docId));
        alert("İptal edildi.");
        resultArea.innerHTML = "<p style='color:#d4af37; text-align:center;'>İptal Edildi.</p>";
        await loadSlots(); 
    } catch (e) { alert("Hata: " + e.message); }
};