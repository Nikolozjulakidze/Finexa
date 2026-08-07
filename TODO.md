# TODO — Card Connection Feature (Georgian + European Banks)

## Goal

Let users connect cards to their real banks (Bank of Georgia, TBC via PSD2 OAuth, and Paysera as a European connector) so connected cards appear in the Cards page with a "live" badge, alongside manually-added cards.

## Steps

### Backend

- [ ] 1. Add `paysera` provider config to `backend/services/bankService.js`
- [ ] 2. Add `paysera` to `providerConfigs` in `backend/controllers/accountsController.js` (optional cleanup)
- [ ] 3. Extend `syncConnection` in `backend/controllers/bankController.js` to capture card info from linked bank accounts into the `cards` table
- [ ] 4. Add migration in `backend/scripts/migrate.js` + `backend/sql/schema.sql` for new card columns (`provider`, `provider_card_id`, `connection_id`)
- [ ] 5. Add endpoint to link/expose connected cards in `cardController.js` / `cardRoutes.js`

### Frontend

- [ ] 6. Update `Cards.jsx` with a "Connect card" flow (OAuth link for BOG/TBC/Paysera) + connected badge
- [ ] 7. Update `CardForm.jsx` to support connection type (Manual / Bank-linked)
- [ ] 8. Add new API paths in `frontend/Finexa/src/utils/apiPaths.js`

### Docs

- [ ] 9. Update `README.md` with credential setup + how card connection works

## Notes

- Full auto-connection of Georgian cards requires live Bank of Georgia / TBC PSD2 merchant credentials.
- Paysera provides European open-banking once you have its API contract/credentials.
