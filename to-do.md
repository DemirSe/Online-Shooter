# To-Do List

## Tamamlanmış Adımlar

- Proje iskeleti oluşturuldu (backend, frontend, Webpack, Babel vb.).
- Temel sunucular (Express ve Socket.IO) yapılandırıldı.
- Frontend kısmında Phaser kullanılarak oyun başlangıcı oluşturuldu.
- Kullanıcı adı seçme sistemi eklendi ve sunucu tarafında kontrol edildi:
  - Kullanıcı adı, sunucuda setUsername eventi ile alınıyor.
  - Duplicate username kontrolü sağlandı.
  - Onay mesajı ile kullanıcıya bildirim yapılıyor.

## Yapılacaklar

- [ ] **Lobby Sistemi:**
  - Oyun lobisi oluşturma ve listeleme işlevlerinin entegrasyonu (described in lobi-sistemi.md).
  - Otomatik üretilen 6 karakterli lobi kodu mantığı.
  - Ready butonunun işleyişi ve lobi durum senkronizasyonu.
- [ ] Kullanıcı arayüzünde detaylandırmalar ve iyileştirmeler (örneğin, modal popup, responsive tasarım vb.).
- [ ] Gelecekte eklenecek özellikler:
  - Oyuncu hareket algoritması, gerçek zamanlı oyun mekanikleri.
  - Lobby içi sohbet (opsiyonel).
  - Ölçeklenebilir oyuncu desteği.

## DEVELOPER NOTU

- Şu ana kadar kullanıcı adı seçme sistemi başarıyla test edildi. 
- Bir sonraki adım, lobi sisteminin entegrasyonunu sağlamlaştırmak ve oyunun çekirdek mekaniklerine (örneğin, oyuncu hareketleri, ready state yönetimi) geçmektir.

_Not: Tüm geliştirme aşamalarında, hem backend hem de frontend'in doğru entegrasyonuna dikkat edilmelidir._ 