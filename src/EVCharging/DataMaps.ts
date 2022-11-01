export const accessDetailCodeTypes = new Map()
  .set("CALL", "Call ahead")
  .set("KEY_AFTER_HOURS", "Card key after hours")
  .set("KEY_ALWAYS", "Card key at all times")
  .set("CREDIT_CARD_AFTER_HOURS", "Credit card after hours")
  .set("CREDIT_CARD_ALWAYS", "Credit card at all times")
  .set("FLEET", "Fleet customers only")
  .set("GOVERNMENT", "Government only")
  .set("LIMITED_HOURS", "Limited hours")
  .set("RESIDENTIAL", "Residential");

export const creditCardTypes = new Map()
  .set("all", "All")
  .set("A", "American Express")
  .set("CREDIT", "Credit")
  .set("Debit", "Debit")
  .set("D", "Discover")
  .set("M", "MasterCard")
  .set("V", "Visa")
  .set("Cash", "Cash")
  .set("Checks", "Check")
  .set("ACCOUNT_BALANCE", "Account Balance")
  .set("ALLIANCE", "Alliance AutoGas")
  .set("ANDROID_PAY", "Android Pay")
  .set("APPLE_PAY", "Apple Pay")
  .set("ARI", "ARI")
  .set("CleanEnergy", "Clean Energy")
  .set("Comdata", "Comdata")
  .set("CFN", "Commercial Fueling Network")
  .set("EFS", "EFS")
  .set("FleetOne", "Fleet One")
  .set("FuelMan", "Fuelman")
  .set("GasCard", "GASCARD")
  .set("PacificPride", "Pacific Pride")
  .set("PHH", "PHH")
  .set("Proprietor", "Proprietor Fleet Card")
  .set("Speedway", "Speedway")
  .set("SuperPass", "SuperPass")
  .set("TCH", "TCH")
  .set("Tchek", "T-Chek T-Card")
  .set("Trillium", "Trillium")
  .set("Voyager", "Voyager")
  .set("Wright_Exp", "WEX");

export const evConnectorTypes = new Map()
  .set("NEMA1450", "NEMA 14-50")
  .set("NEMA515", "NEMA 5-15")
  .set("NEMA520", "NEMA 5-20")
  .set("J1772", "J1772")
  .set("J1772COMBO", "CCS")
  .set("CHADEMO", "CHAdeMO")
  .set("TESLA", "Tesla");

export const evNetworkTypes = new Map()
    .set("AddÉnergie Technologies", "AddÉnergie")
    .set("AMPUP", "AmpUp")
    .set("BCHYDRO", "BC Hydro")
    .set("Blink Network", "Blink")
    .set("CHARGELAB", "ChargeLab")
    .set("ChargePoint Network", "ChargePoint")
    .set("Circuit électrique", "Circuit électrique")
    .set("eCharge Network", "eCharge Network")
    .set("Electrify America", "Electrify America")
    .set("Electrify Canada", "Electrify Canada")
    .set("EVCS", "EV Charging Solutions")
    .set("EV Connect", "EV Connect")
    .set("EVGATEWAY", "evGateway")
    .set("eVgo Network", "EVgo")
    .set("EVRANGE", "EV Range")
    .set("FLO", "FLO")
    .set("FPLEV", "FPL EVolution")
    .set("FCN", "Francis")
    .set("IVY", "Ivy")
    .set("LIVINGSTON", "Livingston Energy Group")
    .set("Non-Networked", "Non-Networked")
    .set("OpConnect", "OpConnect")
    .set("PETROCAN", "Petro-Canada")
    .set("POWERFLEX", "PowerFlex")
    .set("RIVIAN_ADVENTURE", "Rivian Adventure Network")
    .set("RIVIAN_WAYPOINTS", "Rivian Waypoints")
    .set("SemaCharge Network", "SemaConnect")
    .set("SHELL_RECHARGE", "Shell Recharge")
    .set("Sun Country Highway", "Sun Country Highway")
    .set("SWTCH", "Swtch Energy")
    .set("Tesla Destination", "Tesla Destination")
    .set("Tesla", "Tesla Supercharger")
    .set("UNIVERSAL", "Universal EV Chargers")
    .set("Volta", "Volta")
    .set("Webasto", "Webasto")
    .set("ZEFNET", "ZEF Network");

export const facilityTypes = new Map()
  .set( "AIRPORT","Airport" )
  .set( "ARENA", "Arena" )
  .set( "AUTO_REPAIR", "Auto Repair Shop" )
  .set( "BANK", "Bank" )
  .set( "B_AND_B", "B&B" )
  .set( "BREWERY_DISTILLERY_WINERY", "Brewery/Distillery/Winery" )
  .set( "CAMPGROUND", "Campground" )
  .set( "CAR_DEALER", "Car Dealer" )
  .set( "CARWASH", "Carwash" )
  .set( "COLLEGE_CAMPUS", "College Campus" )
  .set( "CONVENIENCE_STORE", "Convenience Store" )
  .set( "CONVENTION_CENTER", "Convention Center" )
  .set( "COOP", "Co-Op" )
  .set( "FACTORY", "Factory" )
  .set( "FED_GOV", "Federal Government" )
  .set( "FIRE_STATION", "Fire Station" )
  .set( "FLEET_GARAGE", "Fleet Garage" )
  .set( "FUEL_RESELLER", "Fuel Reseller" )
  .set( "GROCERY", "Grocery Store" )
  .set( "HARDWARE_STORE", "Hardware Store" )
  .set( "HOSPITAL", "Hospital" )
  .set( "HOTEL", "Hotel" )
  .set( "INN", "Inn" )
  .set( "LIBRARY", "Library" )
  .set( "MIL_BASE", "Military Base" )
  .set( "MOTOR_POOL", "Motor Pool" )
  .set( "MULTI_UNIT_DWELLING", "Multi-Family Housing" )
  .set( "MUNI_GOV", "Municipal Government" )
  .set( "MUSEUM", "Museum" )
  .set( "NATL_PARK", "National Park" )
  .set( "OFFICE_BLDG", "Office Building" )
  .set( "OTHER", "Other" )
  .set( "OTHER_ENTERTAINMENT", "Other Entertainment" )
  .set( "PARK", "Park" )
  .set( "PARKING_GARAGE", "Parking Garage" )
  .set( "PARKING_LOT", "Parking Lot" )
  .set( "PAY_GARAGE", "Pay-Parking Garage" )
  .set( "PAY_LOT", "Pay-Parking Lot" )
  .set( "PHARMACY", "Pharmacy" )
  .set( "PLACE_OF_WORSHIP", "Place of Worship" )
  .set( "PRISON", "Prison" )
  .set( "PUBLIC", "Public" )
  .set( "REC_SPORTS_FACILITY", "Recreational Sports Facility" )
  .set( "REFINERY", "Refinery" )
  .set( "RENTAL_CAR_RETURN", "Rental Car Return" )
  .set( "RESEARCH_FACILITY", "Research Facility/Laboratory" )
  .set( "RESTAURANT", "Restaurant" )
  .set( "REST_STOP", "Rest Stop" )
  .set( "RETAIL", "Retail" )
  .set( "RV_PARK", "RV Park" )
  .set( "SCHOOL", "School" )
  .set( "GAS_STATION", "Service/Gas Station" )
  .set( "SHOPPING_CENTER", "Shopping Center" )
  .set( "SHOPPING_MALL", "Shopping Mall" )
  .set( "STADIUM", "Stadium" )
  .set( "STANDALONE_STATION", "Standalone Station" )
  .set( "STATE_GOV", "State/Provincial Government" )
  .set( "STORAGE", "Storage Facility" )
  .set( "STREET_PARKING", "Street Parking" )
  .set( "TNC", "Transportation Network Company" )
  .set( "TRAVEL_CENTER", "Travel Center" )
  .set( "TRUCK_STOP", "Truck Stop" )
  .set( "UTILITY", "Utility" )
  .set( "WORKPLACE", "Workplace" );
