# Lobi Sistemi

Bu dosya, lobi sistemiyle ilgili yapılması gerekenleri, tasarımları ve soruları içermektedir.

## Gereksinimler ve Tasarım Kararları

- **Maksimum Oyuncu Sayısı:** Şimdilik 2 oyuncu, ancak ölçeklenebilir bir tasarım düşünülmeli.
- **Lobi Oluşturma Akışı:** Kullanıcıya iki seçenek sunulacak:
  - "Oyun Kur" (yeni lobi oluştur)
  - "Oyunları Listele" (mevcut lobi listesini göster)
- **Ayarlar:** Şimdilik ekstra ayar yok; basit bir yapı tercih edilecek, ilerleyen aşamalarda eklenebilir.
- **Hazır Olma Mekanizması:** Her lobbyde bir "Ready" butonu olacak. Bir oyuncu bu butona bastığında, sunucu bu durumu anında tüm lobby üyelerine iletecek.
- **Senkranizasyon Stratejisi:**
  - Oyuncu eylemleri (örneğin, Ready butonuna basılması) gerçekleştiğinde, bu değişiklik anında tüm lobbyye broadcast edilecek.
  - Ekstra heartbeat veya düzenli güncelleme mekanizması şu aşamada gerekli görülmüyor.
  - Yalnızca değişiklik (delta update) bilgisi gönderilecek, tüm durumun tekrar tekrar broadcast edilmesi yerine.
- **Sohbet:** Lobby içi sohbet özelliği, ilerleyen aşamalarda eklenebilir.

## Yapılacaklar

- [ ] Backend ve frontend entegrasyonuyla lobi oluşturma işlevini geliştir.
- [ ] Otomatik üretilen 6 karakterli lobi kodu mantığını oluştur.
- [ ] "Oyun Kur" ve "Oyunları Listele" butonlarının arayüz tasarımını uygula.
- [ ] Ready butonu ile oyuncu hazır bilgisinin sunucu-client arasında işleyişini düzenle.
- [ ] Sadece değişiklik bilgisinin (delta update) broadcast edilmesi mekanizmasını uygula.
- [ ] İlerleyen aşamalarda oyuncu sayısını artırmaya yönelik esnek yapıyı test et.

## Açık Sorular / Tartışılacak Noktalar

1. Bir oyuncu Ready butonuna bastığında, bu değişiklik doğrudan tüm lobbyye iletilecek. Ağ gecikmeleri sonrası ek bir heartbeat mekanizması gerekli mi? (Cevap: Şimdilik gerçek zamanlı update yeterli, ek heartbeat gerekmez.)
2. İlerleyen aşamalarda, oyunun ölçeklenmesi durumunda senkronizasyon için ek stratejiler uygulanmalı mı?

## Notlar

- Geliştirme öncesinde detaylı akış diyagramı ve planlama yapılması önerilir.
- Hem frontend hem de backend tarafında entegrasyon ve test çalışmalarına özen gösterilmeli.
- Tasarım, ileride ek özellikler eklenecek şekilde esnek tutulmalıdır. 